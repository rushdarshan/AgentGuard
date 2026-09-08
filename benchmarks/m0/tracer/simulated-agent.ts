// Seeded-stochastic simulated tool-using agent for the M0 benchmark.
//
// The event this records is a forbidden-call EMISSION -- a would-execute sink
// call. Nothing here ever runs: no fs writes, no network, no shell. The spy sink
// below captures the agent's intent so the gateway and oracle can judge it.

import { mulberry32, TRUST_PROB } from "../types";
import type { Fixture, SinkCall } from "../types";

export interface AgentResult {
  agent_complied: boolean;
  emitted_sink: SinkCall | null;
}

// The "would-execute" sink: records intent, performs NO side effect.
// ponytail: the spy sink never executes; resetSink() clears it between test runs.
export const sinkSpy: SinkCall[] = [];

export function recordSink(call: SinkCall): void {
  sinkSpy.push(call);
}

export function resetSink(): void {
  sinkSpy.length = 0;
}

export function simulateAgent(
  fixture: Fixture,
  seed: number,
  trustProb: number = TRUST_PROB
): AgentResult {
  const rng = mulberry32(seed);
  const draw = rng();
  const complied = draw < trustProb;
  if (complied) {
    recordSink(fixture.emitted_sink);
    return { agent_complied: true, emitted_sink: fixture.emitted_sink };
  }
  return { agent_complied: false, emitted_sink: null };
}
