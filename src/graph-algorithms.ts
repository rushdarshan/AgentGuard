/** A directed weighted edge. For undirected ops we symmetrize. */
export interface Edge {
  source: string;
  target: string;
  weight: number;
}

// ─── Louvain Community Detection ─────────────────────────────
// Undirected weighted. Symmetrizes directed input automatically.

export function detectCommunities(
  nodes: string[],
  edges: Edge[],
  resolution = 1,
): Map<string, number> {
  // symmetrize directed edges
  const sym = new Map<string, Map<string, number>>();
  for (const n of nodes) sym.set(n, new Map());
  for (const e of edges) {
    const a = sym.get(e.source)!;
    const b = sym.get(e.target)!;
    a.set(e.target, (a.get(e.target) ?? 0) + e.weight);
    b.set(e.source, (b.get(e.source) ?? 0) + e.weight);
  }

  const deg = new Map<string, number>();
  let m = 0;
  for (const n of nodes) {
    let d = 0;
    for (const [, w] of sym.get(n)!) d += w;
    deg.set(n, d);
    m += d;
  }
  m /= 2;

  if (m === 0) return new Map(nodes.map((n, i) => [n, i]));

  const m2 = 2 * m;
  const comm = new Map<string, number>();
  nodes.forEach((n, i) => comm.set(n, i));
  const commDeg = new Map<number, number>();
  nodes.forEach((n, i) => commDeg.set(i, deg.get(n)!));

  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      const d = deg.get(node)!;
      const cur = comm.get(node)!;

      commDeg.set(cur, commDeg.get(cur)! - d);
      comm.set(node, -1);

      const cand = new Map<number, number>();
      for (const [nbr] of sym.get(node)!) {
        const nc = comm.get(nbr)!;
        if (nc >= 0) {
          cand.set(nc, (cand.get(nc) ?? 0) + sym.get(node)!.get(nbr)!);
        }
      }

      let best = cur;
      let bestGain = 0;
      for (const [c, ki_in] of cand) {
        const sigma = commDeg.get(c)!;
        const gain = ki_in / m - resolution * (sigma * d) / (m2 * m);
        if (gain > bestGain) { bestGain = gain; best = c; }
      }

      comm.set(node, best);
      commDeg.set(best, commDeg.get(best)! + d);
      if (best !== cur) changed = true;
    }
  }

  const seen = new Map<number, number>();
  let next = 0;
  const result = new Map<string, number>();
  for (const n of nodes) {
    const c = comm.get(n)!;
    if (!seen.has(c)) seen.set(c, next++);
    result.set(n, seen.get(c)!);
  }
  return result;
}

// ─── PageRank ────────────────────────────────────────────────
// Weighted, directed. Dangling nodes handled.

export function pageRank(
  nodes: string[],
  edges: Edge[],
  damping = 0.85,
  maxIter = 100,
  tol = 1e-6,
): Map<string, number> {
  const N = nodes.length;
  if (N === 0) return new Map();

  const inEdges = new Map<string, [string, number][]>();
  const outTotal = new Map<string, number>();
  for (const n of nodes) { inEdges.set(n, []); outTotal.set(n, 0); }
  for (const e of edges) {
    inEdges.get(e.target)!.push([e.source, e.weight]);
    outTotal.set(e.source, outTotal.get(e.source)! + e.weight);
  }

  const dangling = nodes.filter(n => outTotal.get(n)! === 0);
  const rank = new Map<string, number>();
  const init = 1 / N;
  for (const n of nodes) rank.set(n, init);

  for (let iter = 0; iter < maxIter; iter++) {
    let dangleSum = 0;
    for (const n of dangling) dangleSum += rank.get(n)!;

    const dangleContrib = damping * dangleSum / N;
    const base = (1 - damping) / N;
    const next = new Map<string, number>();
    let maxDiff = 0;

    for (const n of nodes) {
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
    if (maxDiff < tol) break;
  }

  return rank;
}

// ─── Dijkstra (single-source shortest path) ─────────────────
// Weighted, directed. Returns null when target is unreachable.

export function shortestPath(
  nodes: string[],
  edges: Edge[],
  source: string,
  target: string,
): { path: string[]; distance: number } | null {
  const adj = new Map<string, [string, number][]>();
  for (const n of nodes) adj.set(n, []);
  for (const e of edges) adj.get(e.source)!.push([e.target, e.weight]);

  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const unvisited = new Set(nodes);
  for (const n of nodes) dist.set(n, Infinity);
  dist.set(source, 0);

  while (unvisited.size > 0) {
    let u: string | null = null;
    let minDist = Infinity;
    for (const n of unvisited) {
      const d = dist.get(n)!;
      if (d < minDist) { minDist = d; u = n; }
    }
    if (u === null || dist.get(u)! === Infinity) break;
    if (u === target) break;

    unvisited.delete(u);
    for (const [v, w] of adj.get(u)!) {
      if (!unvisited.has(v)) continue;
      const alt = dist.get(u)! + w;
      if (alt < dist.get(v)!) {
        dist.set(v, alt);
        prev.set(v, u);
      }
    }
  }

  const d = dist.get(target)!;
  if (d === Infinity) return null;

  const path: string[] = [];
  let cur: string | null = target;
  while (cur !== null) {
    path.unshift(cur);
    cur = prev.get(cur) ?? null;
  }
  return { path, distance: d };
}
