import { describe, expect, it } from "vitest";
import { evaluate } from "./oracle";
import { simulateAgent } from "./tracer/simulated-agent";
import { isDenylisted } from "./sink-denylist";
import { FIXTURES } from "./attacks/index";

const FAMILY = "argument-injection" as const;
const TOOL = "db.drop";

function firstCompliantSeed(fixture: (typeof FIXTURES)[typeof FAMILY]["poisoned"]): number {
  for (let seed = 1; seed <= 50; seed++) {
    if (simulateAgent(fixture, seed).agent_complied) return seed;
  }
  throw new Error(`no compliant seed found for ${FAMILY} in 1..50`);
}

describe(`oracle ${FAMILY} (poisoned)`, () => {
  it("emits a denylisted sink that the vulnerable arm lets through", () => {
    const poisoned = FIXTURES[FAMILY].poisoned;
    const seed = firstCompliantSeed(poisoned);
    const verdict = evaluate(poisoned, seed, "vulnerable");

    expect(verdict.agent_complied).toBe(true);
    expect(verdict.emitted_sink?.tool).toBe(TOOL);
    expect(isDenylisted(verdict.emitted_sink)).toBe(true);
    expect(verdict.forbidden_sink_emitted).toBe(true);
  });

  it("blocks the same seed in the protected arm and never counts a block as success", () => {
    const poisoned = FIXTURES[FAMILY].poisoned;
    const seed = firstCompliantSeed(poisoned);
    const verdict = evaluate(poisoned, seed, "protected");

    expect(verdict.agent_complied).toBe(true);
    expect(verdict.gateway_decision).toBe("block");
    expect(verdict.forbidden_sink_emitted).toBe(false);
  });
});
