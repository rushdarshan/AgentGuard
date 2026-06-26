import neo4j, { Driver } from "neo4j-driver";
import { ENV } from "./env";

let driver: Driver | null = null;

export async function getNeo4j(): Promise<Driver | null> {
  if (driver) return driver;
  if (!ENV.NEO4J_URI || !ENV.NEO4J_USER || !ENV.NEO4J_PASSWORD) return null;
  driver = neo4j.driver(ENV.NEO4J_URI, neo4j.auth.basic(ENV.NEO4J_USER, ENV.NEO4J_PASSWORD));
  try {
    await driver.getServerInfo();
    return driver;
  } catch {
    driver = null;
    return null;
  }
}

export async function ensureSchema(): Promise<void> {
  const d = await getNeo4j();
  if (!d) return;
  const session = d.session();
  try {
    await session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (r:TestResult) REQUIRE r.id IS UNIQUE");
    await session.run("CREATE INDEX IF NOT EXISTS FOR (r:TestResult) ON (r.testRunId)");
  } finally {
    await session.close();
  }
}

export async function saveCascade(
  testRunId: number,
  edges: Array<{ sourceId: number; targetId: number; confidence: number; sourceCategory: string; targetCategory: string; sourcePassRate: number; targetPassRate: number }>
): Promise<void> {
  const d = await getNeo4j();
  if (!d) return;
  const session = d.session();
  try {
    for (const edge of edges) {
      await session.run(
        `MERGE (s:TestResult {id: $sourceId})
         SET s.category = $sourceCategory, s.passRate = $sourcePassRate, s.testRunId = $testRunId
         MERGE (t:TestResult {id: $targetId})
         SET t.category = $targetCategory, t.passRate = $targetPassRate, t.testRunId = $testRunId
         MERGE (s)-[:CAUSES {confidence: $confidence}]->(t)`,
        {
          sourceId: edge.sourceId, targetId: edge.targetId,
          sourceCategory: edge.sourceCategory, targetCategory: edge.targetCategory,
          sourcePassRate: edge.sourcePassRate, targetPassRate: edge.targetPassRate,
          confidence: edge.confidence, testRunId
        }
      );
    }
  } finally {
    await session.close();
  }
}

export async function getCascadesForRun(
  testRunId: number
): Promise<Array<{ sourceId: number; targetId: number; confidence: number }>> {
  const d = await getNeo4j();
  if (!d) return [];
  const session = d.session();
  try {
    const result = await session.run(
      `MATCH (s:TestResult {testRunId: $testRunId})-[r:CAUSES]->(t:TestResult)
       RETURN s.id AS sourceId, t.id AS targetId, r.confidence AS confidence`,
      { testRunId }
    );
    return result.records.map((r) => ({
      sourceId: r.get("sourceId"),
      targetId: r.get("targetId"),
      confidence: r.get("confidence"),
    }));
  } finally {
    await session.close();
  }
}

export async function getCascadesGraph(
  testRunId: number
): Promise<{
  nodes: Array<{ id: number; category: string; passRate: number }>;
  edges: Array<{ sourceId: number; targetId: number; confidence: number }>;
}> {
  const d = await getNeo4j();
  if (!d) return { nodes: [], edges: [] };
  const session = d.session();
  try {
    const nodeResult = await session.run(
      `MATCH (r:TestResult {testRunId: $testRunId})
       RETURN r.id AS id, r.category AS category, r.passRate AS passRate`,
      { testRunId }
    );
    const edgeResult = await session.run(
      `MATCH (s:TestResult {testRunId: $testRunId})-[c:CAUSES]->(t:TestResult)
       RETURN s.id AS sourceId, t.id AS targetId, c.confidence AS confidence`,
      { testRunId }
    );
    return {
      nodes: nodeResult.records.map((r) => ({
        id: r.get("id"),
        category: r.get("category"),
        passRate: r.get("passRate"),
      })),
      edges: edgeResult.records.map((r) => ({
        sourceId: r.get("sourceId"),
        targetId: r.get("targetId"),
        confidence: r.get("confidence"),
      })),
    };
  } finally {
    await session.close();
  }
}

export async function getCascadePatterns(): Promise<Array<{ sourceCategory: string; targetCategory: string; frequency: number; avgConfidence: number }>> {
  const d = await getNeo4j();
  if (!d) return [];
  const session = d.session();
  try {
    const result = await session.run(
      `MATCH (s:TestResult)-[r:CAUSES]->(t:TestResult)
       RETURN s.category AS sourceCategory, t.category AS targetCategory,
              count(*) AS frequency, avg(r.confidence) AS avgConfidence
       ORDER BY frequency DESC`
    );
    return result.records.map((r) => ({
      sourceCategory: r.get("sourceCategory"),
      targetCategory: r.get("targetCategory"),
      frequency: r.get("frequency").toNumber(),
      avgConfidence: Math.round(r.get("avgConfidence")),
    }));
  } finally {
    await session.close();
  }
}
