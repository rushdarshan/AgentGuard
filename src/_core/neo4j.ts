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
    await session.run("CREATE INDEX IF NOT EXISTS FOR (r:TestResult) ON (r.community)");
  } finally {
    await session.close();
  }
}

export async function saveCascade(
  testRunId: number,
  edges: Array<{ sourceId: number; targetId: number; confidence: number; sourceCategory: string; targetCategory: string; sourcePassRate: number; targetPassRate: number; sourceLanguage?: string; targetLanguage?: string }>
): Promise<void> {
  const d = await getNeo4j();
  if (!d) return;
  const session = d.session();
  try {
    for (const edge of edges) {
      await session.run(
        `MERGE (s:TestResult {id: $sourceId})
         SET s.category = $sourceCategory, s.passRate = $sourcePassRate, s.testRunId = $testRunId,
             s.language = $sourceLanguage, s.timestamp = timestamp()
         MERGE (t:TestResult {id: $targetId})
         SET t.category = $targetCategory, t.passRate = $targetPassRate, t.testRunId = $testRunId,
             t.language = $targetLanguage, t.timestamp = timestamp()
         MERGE (s)-[:CAUSES {confidence: $confidence}]->(t)`,
        {
          sourceId: edge.sourceId, targetId: edge.targetId,
          sourceCategory: edge.sourceCategory, targetCategory: edge.targetCategory,
          sourcePassRate: edge.sourcePassRate, targetPassRate: edge.targetPassRate,
          sourceLanguage: edge.sourceLanguage || "en", targetLanguage: edge.targetLanguage || "en",
          confidence: edge.confidence, testRunId
        }
      );
    }
  } finally {
    await session.close();
  }
}

function louvain(
  nodeIds: number[],
  edges: Array<{ sourceId: number; targetId: number; weight: number }>
): Map<number, number> {
  const community = new Map<number, number>();
  for (const id of nodeIds) community.set(id, id);

  const adj = new Map<number, Map<number, number>>();
  for (const id of nodeIds) adj.set(id, new Map());
  for (const e of edges) {
    adj.get(e.sourceId)?.set(e.targetId, (adj.get(e.sourceId)?.get(e.targetId) || 0) + e.weight);
    adj.get(e.targetId)?.set(e.sourceId, (adj.get(e.targetId)?.get(e.sourceId) || 0) + e.weight);
  }

  let m = edges.reduce((s, e) => s + e.weight, 0) / 2;
  if (m === 0) {
    for (const id of nodeIds) community.set(id, 0);
    return community;
  }

  const k = new Map<number, number>();
  for (const id of nodeIds) {
    let sum = 0;
    for (const w of adj.get(id)?.values() || []) sum += w;
    k.set(id, sum);
  }

  const commTot = new Map<number, number>();
  const commIn = new Map<number, number>();
  for (const id of nodeIds) {
    commTot.set(id, k.get(id) || 0);
    commIn.set(id, 0);
  }
  for (const e of edges) {
    if (community.get(e.sourceId) === community.get(e.targetId)) {
      const c = community.get(e.sourceId)!;
      commIn.set(c, (commIn.get(c) || 0) + e.weight);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const id of nodeIds) {
      const curComm = community.get(id)!;
      const ki = k.get(id) || 0;
      let kiIn = 0;
      for (const [nbr, w] of adj.get(id) || []) {
        if (community.get(nbr) === curComm) kiIn += w;
      }

      const best = { comm: -1, gain: 0 };
      const seen = new Set<number>();
      for (const [nbr] of adj.get(id) || []) {
        const c = community.get(nbr)!;
        if (seen.has(c)) continue;
        seen.add(c);
        if (c === curComm) continue;

        let kiToC = 0;
        for (const [nn, w] of adj.get(id) || []) {
          if (community.get(nn) === c) kiToC += w;
        }

        const totC = commTot.get(c) || 0;
        const inC = commIn.get(c) || 0;
        const totCur = commTot.get(curComm) || 0;
        const inCur = commIn.get(curComm) || 0;

        const gain = (inC + 2 * kiToC) / (2 * m)
          - ((totC + ki) / (2 * m)) ** 2
          - (inCur / (2 * m) - (totCur / (2 * m)) ** 2 - (ki / (2 * m)) ** 2
             + (kiIn / (2 * m)));

        if (gain > best.gain) {
          best.comm = c;
          best.gain = gain;
        }
      }

      if (best.gain > 0) {
        changed = true;
        // remove from old community
        commIn.set(curComm, (commIn.get(curComm) || 0) - kiIn);
        commTot.set(curComm, (commTot.get(curComm) || 0) - ki);
        // add to new community
        community.set(id, best.comm);
        commIn.set(best.comm, (commIn.get(best.comm) || 0) + kiToC(id, adj, community, best.comm));
        commTot.set(best.comm, (commTot.get(best.comm) || 0) + ki);
      }
    }
  }

  return community;
}

function kiToC(
  nodeId: number,
  adj: Map<number, Map<number, number>>,
  community: Map<number, number>,
  targetComm: number
): number {
  let sum = 0;
  for (const [nbr, w] of adj.get(nodeId) || []) {
    if (community.get(nbr) === targetComm) sum += w;
  }
  return sum;
}

export async function detectCommunities(
  testRunId: number
): Promise<Array<{ id: number; community: number }>> {
  const d = await getNeo4j();
  if (!d) return [];

  const session = d.session();
  try {
    // Try GDS Louvain first
    try {
      const gdsResult = await session.run(
        `CALL gds.graph.project('proj-${testRunId}', 'TestResult', 'CAUSES',
           { relationshipProperties: 'confidence' },
           { sourceNodeProperties: { testRunId: $testRunId } })
         YIELD graphName, nodeCount, relationshipCount
         RETURN graphName, nodeCount, relationshipCount`,
        { testRunId }
      );
      if (gdsResult.records.length > 0) {
        await session.run(
          `CALL gds.louvain.mutate('proj-${testRunId}', { mutateProperty: 'community', relationshipWeightProperty: 'confidence' })`
        );
        const result = await session.run(
          `MATCH (r:TestResult {testRunId: $testRunId})
           RETURN r.id AS id, r.community AS community`,
          { testRunId }
        );
        await session.run(`CALL gds.graph.drop('proj-${testRunId}')`);
        return result.records.map((r) => ({
          id: r.get("id"),
          community: r.get("community"),
        }));
      }
    } catch {
      // GDS unavailable, use client-side Louvain
    }

    // Client-side Louvain fallback
    const nodeResult = await session.run(
      `MATCH (r:TestResult {testRunId: $testRunId}) RETURN r.id AS id`,
      { testRunId }
    );
    const edgeResult = await session.run(
      `MATCH (s:TestResult {testRunId: $testRunId})-[c:CAUSES]->(t:TestResult)
       RETURN s.id AS sourceId, t.id AS targetId, c.confidence AS weight`,
      { testRunId }
    );

    const nodeIds = nodeResult.records.map((r) => r.get("id") as number);
    const edges = edgeResult.records.map((r) => ({
      sourceId: r.get("sourceId") as number,
      targetId: r.get("targetId") as number,
      weight: (r.get("weight") as number) || 1,
    }));

    const communities = louvain(nodeIds, edges);

    // Write community IDs back to Neo4j
    for (const [id, community] of communities) {
      await session.run(
        `MATCH (r:TestResult {id: $id}) SET r.community = $community`,
        { id, community }
      );
    }

    return Array.from(communities.entries()).map(([id, community]) => ({ id, community }));
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
  nodes: Array<{ id: number; category: string; passRate: number; language: string; community: number | null }>;
  edges: Array<{ sourceId: number; targetId: number; confidence: number }>;
}> {
  const d = await getNeo4j();
  if (!d) return { nodes: [], edges: [] };
  const session = d.session();
  try {
    const nodeResult = await session.run(
      `MATCH (r:TestResult {testRunId: $testRunId})
       RETURN r.id AS id, r.category AS category, r.passRate AS passRate,
              r.language AS language, r.community AS community`,
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
        language: r.get("language") || "en",
        community: r.get("community") || null,
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
