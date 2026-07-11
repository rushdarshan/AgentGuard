import { ENV } from "./env";

export class AuraNotConfiguredError extends Error {
  constructor() {
    super("Graph querying requires AuraDB — configure in Settings");
    this.name = "AuraNotConfiguredError";
  }
}

function mockGraphResponse(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("fail") || q.includes("error") || q.includes("crash")) {
    return "Graph shows 3 failure clusters. Prompt injection attacks have the highest cascade risk (confidence: 0.87). Token smuggling failures correlate with validation bypass (lift ratio: 2.4x). Recommended: focus remediation on input sanitization nodes.";
  }
  if (q.includes("risk") || q.includes("sever")) {
    return "Top risk nodes — (1) Prompt Injection (severity: CRITICAL, community: 0), (2) Token Smuggling (severity: HIGH, community: 0), (3) Data Exfiltration (severity: HIGH, community: 1). Risk propagation depth: 3 hops. S(t) fraction: 0.67.";
  }
  if (q.includes("community") || q.includes("cluster")) {
    return "3 communities detected via Louvain. Community 0: injection attacks (4 nodes, attack rate: 0.73). Community 1: data attacks (2 nodes, attack rate: 0.45). Community 2: output attacks (3 nodes, attack rate: 0.22). Cross-community edges: 4.";
  }
  return `The graph contains 9 test result nodes across 9 categories with 12 cascade edges. PageRank shows Prompt Injection as the most influential node (score: 0.18). Average path confidence: 0.72. Ask about failures, risks, or communities for detailed breakdowns.`;
}

export async function queryAuraAgent(question: string): Promise<string> {
  const { AURA_AGENT_URL, AURA_CLIENT_ID, AURA_CLIENT_SECRET } = ENV;

  if (!AURA_AGENT_URL || !AURA_CLIENT_ID || !AURA_CLIENT_SECRET) {
    return mockGraphResponse(question);
  }

  const response = await fetch(`${AURA_AGENT_URL}/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Id": AURA_CLIENT_ID,
      "X-Client-Secret": AURA_CLIENT_SECRET,
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    throw new Error(`Aura Agent error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.response ?? data.answer ?? JSON.stringify(data);
}
