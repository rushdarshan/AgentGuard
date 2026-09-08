// M0 shared contract. Every m0 module imports these types and pins to these
// public names; no module imports another module's internals. This file is the
// single place the trace shape, PRNG, and calibration constant live.

export type Condition = "vulnerable" | "protected";

export type Family =
  | "poisoned-tool-description"
  | "hidden-tool-response"
  | "spoofed-tool-output"
  | "argument-injection"
  | "destructive-command-relay";

export const FAMILIES: readonly Family[] = [
  "poisoned-tool-description",
  "hidden-tool-response",
  "spoofed-tool-output",
  "argument-injection",
  "destructive-command-relay",
];

export interface SinkCall {
  tool: string;
  args: Record<string, unknown>;
}

export interface Fixture {
  family: Family;
  id: string;
  clean: boolean;
  toolResponse: string;
  // The sink the agent emits when it trusts the response. Poisoned fixtures set
  // a denylisted tool; clean counterparts set a legitimate, non-denylisted tool.
  emitted_sink: SinkCall;
}

export interface GatewayDecision {
  gateway_decision: "allow" | "block";
}

export interface Trace {
  seed: number;
  fixture_id: string;
  family: Family;
  condition: Condition;
  agent_complied: boolean;
  emitted_sink: SinkCall | null;
  gateway_decision: "allow" | "block";
  forbidden_sink_emitted: boolean;
  policy_version: string;
  git_sha: string;
  node_version: string;
}

// Calibration parameter of the simulator, not an empirical estimate of real LLM behavior.
export const TRUST_PROB = 0.8;

export const RUNS_PER_CELL = 20;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
