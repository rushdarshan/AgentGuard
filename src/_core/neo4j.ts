import neo4j from "neo4j-driver";
import { ENV } from "./env";

let driver: neo4j.Driver | null = null;

export async function getNeoDriver() {
  if (driver) return driver;
  if (!ENV.NEO4J_URI) return null;
  try {
    driver = neo4j.driver(
      ENV.NEO4J_URI,
      neo4j.auth.basic(ENV.NEO4J_USER || "neo4j", ENV.NEO4J_PASSWORD || ""),
      { maxConnectionLifetime: 30 * 60 * 1000 }
    );
    await driver.verifyConnectivity();
    console.log("[Neo4j] Connected to", ENV.NEO4J_URI);
    return driver;
  } catch (err) {
    console.warn("[Neo4j] Connection failed, using JS fallback:", err);
    driver = null;
    return null;
  }
}

function isGdsAvailable(): boolean {
  return !!(ENV.NEO4J_URI && !ENV.NEO4J_URI.includes("aura"));
}

export async function syncRunToNeo4j(
  testRunId: number,
  results: Array<{ id: number; category: string; passed: number; failed: number; severity: string }>,
  cascades: Array<{ sourceResultId: number; targetResultId: number; confidence: number }>
): Promise<boolean> {
  const drv = await getNeoDriver();
  if (!drv) return false;

  const session = drv.session();
  try {
    await session.executeWrite(async (tx) => {
      await tx.run(
        `MERGE (run:TestRun {id: $testRunId})
         SET run.analyzedAt = datetime()`,
        { testRunId }
      );

      for (const r of results) {
        await tx.run(
          `MERGE (result:TestResult {id: $id})
           SET result.runId = $runId, result.category = $category, result.passed = $passed,
               result.failed = $failed, result.severity = $severity
           MERGE (run)-[:HAS_RESULT]->(result)`,
          { id: r.id, runId: testRunId, category: r.category, passed: r.passed, failed: r.failed, severity: r.severity }
        );
      }

      for (const c of cascades) {
        await tx.run(
          `MATCH (source:TestResult {id: $sourceId}), (target:TestResult {id: $targetId})
           MERGE (source)-[:CAUSES {confidence: $confidence}]->(target)`,
          { sourceId: c.sourceResultId, targetId: c.targetResultId, confidence: c.confidence }
        );
      }
    });
    return true;
  } catch (err) {
    console.warn("[Neo4j] Sync failed:", err);
    return false;
  } finally {
    await session.close();
  }
}

export async function runLouvainGds(
  testRunId: number
): Promise<Map<number, number> | null> {
  const drv = await getNeoDriver();
  if (!drv || !isGdsAvailable()) return null;

  const session = drv.session();
  try {
    const graphName = `cascade-${testRunId}`;
    await session.run(`CALL gds.graph.drop($graphName, false) YIELD graphName`, { graphName }).catch(() => {});
    await session.run(`CALL gds.graph.project($graphName, 'TestResult', 'CAUSES', {relationshipProperties: ['confidence'], relationshipOrientation: 'UNDIRECTED'})`, { graphName });
    const result = await session.run(
      `CALL gds.louvain.stream($graphName, {relationshipWeightProperty: 'confidence'})
       YIELD nodeId, communityId
       RETURN gds.util.asNode(nodeId).id AS resultId, communityId`,
      { graphName }
    );
    await session.run(`CALL gds.graph.drop($graphName, false) YIELD graphName`, { graphName }).catch(() => {});

    const communities = new Map<number, number>();
    for (const record of result.records) {
      communities.set(
        record.get("resultId").toNumber(),
        record.get("communityId").toNumber()
      );
    }
    return communities;
  } catch (err) {
    console.warn("[Neo4j] GDS Louvain failed:", err);
    return null;
  } finally {
    await session.close();
  }
}

export async function runPageRankGds(
  testRunId: number
): Promise<Map<number, number> | null> {
  const drv = await getNeoDriver();
  if (!drv || !isGdsAvailable()) return null;

  const session = drv.session();
  try {
    const graphName = `pr-${testRunId}`;
    await session.run(`CALL gds.graph.drop($graphName, false) YIELD graphName`, { graphName }).catch(() => {});
    await session.run(`CALL gds.graph.project($graphName, 'TestResult', 'CAUSES', {relationshipProperties: ['confidence']})`, { graphName });
    const result = await session.run(
      `CALL gds.pageRank.stream($graphName, {relationshipWeightProperty: 'confidence'})
       YIELD nodeId, score
       RETURN gds.util.asNode(nodeId).id AS resultId, score`,
      { graphName }
    );
    await session.run(`CALL gds.graph.drop($graphName, false) YIELD graphName`, { graphName }).catch(() => {});

    const ranks = new Map<number, number>();
    for (const record of result.records) {
      ranks.set(record.get("resultId").toNumber(), record.get("score"));
    }
    return ranks;
  } catch (err) {
    console.warn("[Neo4j] GDS PageRank failed:", err);
    return null;
  } finally {
    await session.close();
  }
}

// JS fallback graph algorithms (used when Neo4j/GDS unavailable)

interface JsEdge {
  source: number;
  target: number;
  weight: number;
}

function jsLouvain(nodeIds: number[], edges: JsEdge[]): Map<number, number> {
  const sym = new Map<number, Map<number, number>>();
  for (const id of nodeIds) sym.set(id, new Map());
  for (const e of edges) {
    const a = sym.get(e.source)!;
    const b = sym.get(e.target)!;
    a.set(e.target, (a.get(e.target) ?? 0) + e.weight);
    b.set(e.source, (b.get(e.source) ?? 0) + e.weight);
  }

  const deg = new Map<number, number>();
  let m = 0;
  for (const n of nodeIds) {
    let d = 0;
    for (const [, w] of sym.get(n)!) d += w;
    deg.set(n, d);
    m += d;
  }
  m /= 2;

  if (m === 0) return new Map(nodeIds.map((n, i) => [n, i]));

  const m2 = 2 * m;
  const comm = new Map<number, number>();
  nodeIds.forEach((n, i) => comm.set(n, i));
  const commDeg = new Map<number, number>();
  nodeIds.forEach((n, i) => commDeg.set(i, deg.get(n)!));

  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodeIds) {
      const d = deg.get(node)!;
      const cur = comm.get(node)!;

      commDeg.set(cur, commDeg.get(cur)! - d);
      comm.set(node, -1);

      const cand = new Map<number, number>();
      for (const [nbr] of sym.get(node)!) {
        const nc = comm.get(nbr)!;
        if (nc >= 0) cand.set(nc, (cand.get(nc) ?? 0) + sym.get(node)!.get(nbr)!);
      }

      let best = cur;
      let bestGain = 0;
      for (const [c, kiIn] of cand) {
        const sigma = commDeg.get(c)!;
        const gain = kiIn / m - (sigma * d) / (m2 * m);
        if (gain > bestGain) { bestGain = gain; best = c; }
      }

      comm.set(node, best);
      commDeg.set(best, commDeg.get(best)! + d);
      if (best !== cur) changed = true;
    }
  }

  const seen = new Map<number, number>();
  let next = 0;
  const result = new Map<number, number>();
  for (const n of nodeIds) {
    const c = comm.get(n)!;
    if (!seen.has(c)) seen.set(c, next++);
    result.set(n, seen.get(c)!);
  }
  return result;
}

function jsPageRank(nodeIds: number[], edges: JsEdge[]): Map<number, number> {
  const N = nodeIds.length;
  if (N === 0) return new Map();

  const inEdges = new Map<number, Array<[number, number]>>();
  const outTotal = new Map<number, number>();
  for (const n of nodeIds) { inEdges.set(n, []); outTotal.set(n, 0); }
  for (const e of edges) {
    inEdges.get(e.target)!.push([e.source, e.weight]);
    outTotal.set(e.source, outTotal.get(e.source)! + e.weight);
  }

  const damping = 0.85;
  const dangling = nodeIds.filter(n => outTotal.get(n)! === 0);
  const rank = new Map<number, number>();
  const init = 1 / N;
  for (const n of nodeIds) rank.set(n, init);

  for (let iter = 0; iter < 100; iter++) {
    let dangleSum = 0;
    for (const n of dangling) dangleSum += rank.get(n)!;
    const dangleContrib = damping * dangleSum / N;
    const base = (1 - damping) / N;
    const next = new Map<number, number>();
    let maxDiff = 0;

    for (const n of nodeIds) {
      let sum = 0;
      for (const [src, w] of inEdges.get(n)!) {
        const t = outTotal.get(src)!;
        if (t > 0) sum += rank.get(src)! * w / t;
      }
      const pr = base + damping * sum + dangleContrib;
      next.set(n, pr);
      maxDiff = Math.max(maxDiff, Math.abs(pr - rank.get(n)!));
    }

    for (const [n, pr] of next) rank.set(n, pr);
    if (maxDiff < 1e-6) break;
  }

  return rank;
}

// Community attack rate: per-community failure density
export function computeCommunityStats(
  communities: Map<number, number>,
  results: Array<{ id: number; category: string; passed: number; failed: number }>
): Map<number, { totalTests: number; failedTests: number; attackRate: number }> {
  const stats = new Map<number, { total: number; failed: number }>();
  for (const [id, commId] of communities) {
    const r = results.find(x => x.id === id);
    if (!r) continue;
    const s = stats.get(commId) ?? { total: 0, failed: 0 };
    s.total += r.passed + r.failed;
    s.failed += r.failed;
    stats.set(commId, s);
  }
  const out = new Map<number, { totalTests: number; failedTests: number; attackRate: number }>();
  for (const [id, s] of stats) {
    out.set(id, { totalTests: s.total, failedTests: s.failed, attackRate: s.total > 0 ? +(s.failed / s.total).toFixed(2) : 0 });
  }
  return out;
}

// Risk propagation: each node's final score = 90% own + 10% neighbor average, 2 passes
export function propagateRisk(
  scores: Map<number, number>,
  edges: Array<{ source: number; target: number; weight: number }>
): Map<number, number> {
  const result = new Map(scores);
  const adj = new Map<number, Set<number>>();
  for (const [k] of scores) adj.set(k, new Set());
  for (const e of edges) {
    adj.get(e.source)?.add(e.target);
    adj.get(e.target)?.add(e.source);
  }
  for (let pass = 0; pass < 2; pass++) {
    for (const [id, val] of result) {
      const neighbors = adj.get(id);
      if (!neighbors || neighbors.size === 0) continue;
      let neighborSum = 0;
      for (const nid of neighbors) neighborSum += result.get(nid) ?? 0;
      const neighborAvg = neighborSum / neighbors.size;
      result.set(id, val * 0.9 + neighborAvg * 0.1);
    }
  }
  return result;
}

// Causal lift: P(target fails | source fails) / P(target fails unconditionally)

// Beta-Binomial conjugate: sample from Beta(1+successes, 1+failures)
function betaSample(alpha: number, beta: number): number {
  const x = Math.random() ** (1 / alpha);
  const y = Math.random() ** (1 / beta);
  return x / (x + y);
}

function betaCI(successes: number, failures: number, nSamples = 5000): [number, number] {
  const samples: number[] = [];
  for (let i = 0; i < nSamples; i++) samples.push(betaSample(1 + successes, 1 + failures));
  samples.sort((a, b) => a - b);
  return [samples[Math.floor(nSamples * 0.025)], samples[Math.floor(nSamples * 0.975)]];
}

export interface LiftRatio {
  sourceCategory: string;
  targetCategory: string;
  riskDiff: number;
  liftRatio: number;
  ciLower: number;
  ciUpper: number;
}

export interface PropagationMetrics {
  /** Fraction of failure categories that propagate to at least one downstream category */
  sFraction: number;
  /** Average cascade depth (mean path length) */
  avgDepth: number;
}

export async function computeLiftRatios(
  testRunId: number,
  results: Array<{ id: number; category: string; passed: number; failed: number }>,
  cascades: Array<{ sourceResultId: number; targetResultId: number; confidence: number }>
): Promise<{ lifts: LiftRatio[]; propagation: PropagationMetrics }> {
  const resultMap = new Map(results.map(r => [r.id, r]));

  const lifts: LiftRatio[] = [];
  for (const c of cascades) {
    const target = resultMap.get(c.targetResultId);
    const source = resultMap.get(c.sourceResultId);
    if (!target || !source) continue;

    const pB = target.failed / (target.passed + target.failed) || 0.01;
    const pConf = c.confidence / 100;
    const riskDiff = +(pConf - pB).toFixed(3);
    const liftRatio = +(pConf / pB).toFixed(2);

    // Bootstrap CI via Beta-Binomial
    const nTot = target.passed + target.failed;
    const pBSamples = [];
    const confSamples = [];
    for (let i = 0; i < 2000; i++) {
      pBSamples.push(betaSample(1 + target.failed, 1 + target.passed));
      confSamples.push(betaSample(1 + c.confidence, 1 + (100 - c.confidence)));
    }
    pBSamples.sort((a, b) => a - b);
    confSamples.sort((a, b) => a - b);

    const liftsBoot = confSamples.map((c, i) => c / Math.max(pBSamples[i], 0.001));
    liftsBoot.sort((a, b) => a - b);

    lifts.push({
      sourceCategory: source.category,
      targetCategory: target.category,
      riskDiff,
      liftRatio,
      ciLower: +(liftsBoot[50] ?? 0).toFixed(2),
      ciUpper: +(liftsBoot[1950] ?? 0).toFixed(2),
    });
  }
  lifts.sort((a, b) => b.riskDiff - a.riskDiff);

  // S(t): fraction of categories with failures that have outgoing cascades
  const failingCats = new Set(results.filter(r => r.failed > 0).map(r => r.id));
  const sourceCats = new Set(cascades.map(c => c.sourceResultId));
  const sFraction = failingCats.size > 0
    ? [...sourceCats].filter(id => failingCats.has(id)).length / failingCats.size
    : 0;

  // Avg cascade depth: longest chain length
  const adj = new Map<number, number[]>();
  for (const c of cascades) {
    if (!adj.has(c.sourceResultId)) adj.set(c.sourceResultId, []);
    adj.get(c.sourceResultId)!.push(c.targetResultId);
  }
  let maxDepth = 0;
  for (const src of adj.keys()) {
    const visited = new Set<number>();
    function dfs(n: number, d: number) { if (d > maxDepth) maxDepth = d; visited.add(n); for (const next of adj.get(n) ?? []) if (!visited.has(next)) dfs(next, d + 1); }
    dfs(src, 0);
  }

  return { lifts, propagation: { sFraction: +sFraction.toFixed(2), avgDepth: maxDepth } };
}

// Path traversal: variable-length CAUSES chains ranked by path confidence

export interface CascadePath {
  chain: string[];
  pathConfidence: number;
}

export async function findCascadePaths(
  testRunId: number,
  results: Array<{ id: number; category: string }>,
  cascades: Array<{ sourceResultId: number; targetResultId: number; confidence: number }>,
  maxDepth = 4
): Promise<CascadePath[]> {
  const drv = await getNeoDriver();
  if (drv) {
    try {
      const session = drv.session();
      const r = await session.run(
        `MATCH path = (a:TestResult {runId: $runId})-[:CAUSES*2..$maxDepth]->(b:TestResult {runId: $runId})
         WITH [n IN nodes(path) | n.category] AS chain,
              reduce(s = 1.0, r IN relationships(path) | s * r.confidence) AS pathConfidence
         RETURN chain, pathConfidence
         ORDER BY pathConfidence DESC LIMIT 5`,
        { runId: testRunId, maxDepth }
      );
      await session.close();
      return r.records.map(rec => ({
        chain: rec.get("chain"),
        pathConfidence: rec.get("pathConfidence"),
      }));
    } catch (err) { console.warn(err);  }
  }

  const resultMap = new Map(results.map(r => [r.id, r.category]));
  const adj = new Map<number, Array<{ target: number; confidence: number }>>();
  for (const c of cascades) {
    if (!adj.has(c.sourceResultId)) adj.set(c.sourceResultId, []);
    adj.get(c.sourceResultId)!.push({ target: c.targetResultId, confidence: c.confidence });
  }

  const found: CascadePath[] = [];
  function dfs(cur: number, chain: number[], conf: number) {
    if (chain.length >= 2) found.push({ chain: chain.map(id => resultMap.get(id) ?? "?"), pathConfidence: conf });
    if (chain.length >= maxDepth) return;
    for (const edge of adj.get(cur) ?? []) {
      if (!chain.includes(edge.target)) {
        chain.push(edge.target);
        dfs(edge.target, chain, conf * edge.confidence);
        chain.pop();
      }
    }
  }

  for (const src of adj.keys()) dfs(src, [src], 1.0);
  found.sort((a, b) => b.pathConfidence - a.pathConfidence);
  return found.slice(0, 5);
}

// Cross-run: compare two runs and report category-level deltas

export interface CrossRunDelta {
  category: string;
  communityChanged: boolean;
  riskRankDelta: number;
  oldFailed: number;
  newFailed: number;
}

export async function compareRuns(
  runIdA: number,
  runIdB: number,
  resultsA: Array<{ id: number; category: string; failed: number }>,
  resultsB: Array<{ id: number; category: string; failed: number }>,
  cascadesA: Array<{ sourceResultId: number; targetResultId: number; confidence: number }>,
  cascadesB: Array<{ sourceResultId: number; targetResultId: number; confidence: number }>
): Promise<CrossRunDelta[]> {
  const { communities: commA, pageRanks: prA } = await analyzeRunGraph(runIdA, resultsA, cascadesA);
  const { communities: commB, pageRanks: prB } = await analyzeRunGraph(runIdB, resultsB, cascadesB);

  const catByIdA = new Map(resultsA.map(r => [r.id, r]));
  const catByIdB = new Map(resultsB.map(r => [r.id, r]));
  const idByCat = new Map<string, number>();
  for (const r of resultsA) idByCat.set(r.category, r.id);
  for (const r of resultsB) idByCat.set(r.category, r.id);

  const deltas: CrossRunDelta[] = [];
  const allCats = new Set([...resultsA.map(r => r.category), ...resultsB.map(r => r.category)]);
  for (const cat of allCats) {
    const id = idByCat.get(cat);
    if (id === undefined) continue;
    const ra = catByIdA.get(id);
    const rb = catByIdB.get(id);
    deltas.push({
      category: cat,
      communityChanged: commA.get(id) !== commB.get(id),
      riskRankDelta: (prB.get(id) ?? 0) - (prA.get(id) ?? 0),
      oldFailed: ra?.failed ?? 0,
      newFailed: rb?.failed ?? 0,
    });
  }
  return deltas;
}

// Main integration: write to Neo4j, run analysis, return communities + pageRanks

export interface GraphAnalysis {
  communities: Map<number, number>;
  pageRanks: Map<number, number>;
  source: "gds" | "js-fallback" | "none";
}

export async function analyzeRunGraph(
  testRunId: number,
  results: Array<{ id: number; category: string; passed: number; failed: number; severity: string }>,
  cascades: Array<{ sourceResultId: number; targetResultId: number; confidence: number }>
): Promise<GraphAnalysis> {
  await syncRunToNeo4j(testRunId, results, cascades);

  let communities: Map<number, number> | null = null;
  let pageRanks: Map<number, number> | null = null;
  let source: GraphAnalysis["source"] = "none";

  if (isGdsAvailable()) {
    communities = await runLouvainGds(testRunId);
    pageRanks = await runPageRankGds(testRunId);
    if (communities) source = "gds";
  }

  if (!communities) {
    const nodeIds = results.map(r => r.id);
    const edges: JsEdge[] = cascades.map(c => ({
      source: c.sourceResultId,
      target: c.targetResultId,
      weight: c.confidence,
    }));
    communities = jsLouvain(nodeIds, edges);
    pageRanks = jsPageRank(nodeIds, edges);
    source = "js-fallback";
  }

  return { communities, pageRanks: pageRanks ?? new Map(), source };
}
