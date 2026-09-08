import { describe, expect, it } from "vitest";
import { computeRows } from "./report";
import type { Trace } from "./types";

function mkTrace(overrides: Partial<Trace>): Trace {
  return {
    seed: 1,
    fixture_id: "argument-injection.poisoned",
    family: "argument-injection",
    condition: "vulnerable",
    agent_complied: false,
    emitted_sink: null,
    gateway_decision: "allow",
    forbidden_sink_emitted: false,
    trust_probability: 0.8,
    policy_version: "sha256:test",
    git_sha: "test",
    node_version: process.version,
    ...overrides,
  };
}

describe("report zero-denominator policy", () => {
  it("reports BlockRate and FP as NA when the vulnerable/clean denominators are zero", () => {
    const traces: Trace[] = [];
    for (let seed = 1; seed <= 20; seed++) {
      // vulnerable arm never complies -> zero forbidden attempts
      traces.push(mkTrace({ seed, condition: "vulnerable" }));
      traces.push(mkTrace({ seed, condition: "protected" }));
      // no clean controls emitted a legit sink -> zero FP denominator
      traces.push(
        mkTrace({
          seed,
          condition: "protected",
          fixture_id: "argument-injection.clean",
        }),
      );
    }
    const row = computeRows(traces).find((r) => r.family === "argument-injection");
    expect(row?.blockRate).toBeNull();
    expect(row?.blockRateCI).toBe("NA");
    expect(row?.fp).toBeNull();
    expect(row?.fpCI).toBe("NA");
  });

  it("computes a real BlockRate when attempts exist", () => {
    const traces: Trace[] = [];
    for (let seed = 1; seed <= 20; seed++) {
      const sink = { tool: "fs.rm", args: { path: "/tmp/x" } };
      traces.push(
        mkTrace({
          seed,
          condition: "vulnerable",
          agent_complied: true,
          emitted_sink: sink,
          forbidden_sink_emitted: true,
        }),
      );
      traces.push(
        mkTrace({
          seed,
          condition: "protected",
          agent_complied: true,
          emitted_sink: sink,
          gateway_decision: "block",
        }),
      );
    }
    const row = computeRows(traces).find((r) => r.family === "argument-injection");
    expect(row?.blockRate).toBe(1);
    expect(row?.blockRateCI).not.toBe("NA");
  });
});
