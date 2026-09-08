import { describe, expect, it } from "vitest";
import { runAll } from "./runner";
import { assertFixtureSet } from "./attacks/index";
import { FAMILIES, RUNS_PER_CELL, TRUST_PROB } from "./types";
import type { Trace } from "./types";

describe("runner", () => {
  it("accepts the committed fixture set", () => {
    expect(() => assertFixtureSet()).not.toThrow();
  });

  it("produces the full paired matrix (300 traces)", () => {
    const traces = runAll();
    expect(traces).toHaveLength(300);
  });

  it("keeps agent_complied identical across arms for every seed (pairing invariant)", () => {
    const traces = runAll();
    for (const family of FAMILIES) {
      // Pairing is only defined on the poisoned fixture: clean controls run in the
      // protected arm alone, so including them here makes the Map keys collide.
      const poisoned = traces.filter(
        (t) => t.family === family && t.fixture_id.endsWith(".poisoned"),
      );
      const vulnerable = new Map<number, boolean>();
      const protectedArm = new Map<number, boolean>();
      for (const t of poisoned) {
        (t.condition === "vulnerable" ? vulnerable : protectedArm).set(t.seed, t.agent_complied);
      }
      for (let seed = 1; seed <= RUNS_PER_CELL; seed++) {
        expect(protectedArm.get(seed)).toBe(vulnerable.get(seed));
      }
    }
  });

  it("stamps every trace with policy, trust probability, git sha and node version", () => {
    const traces = runAll();
    expect(traces.length).toBeGreaterThan(0);
    for (const trace of traces as Trace[]) {
      expect(trace.policy_version.startsWith("sha256:")).toBe(true);
      expect(trace.trust_probability).toBe(TRUST_PROB);
      expect(typeof trace.git_sha).toBe("string");
      expect(trace.node_version).toBe(process.version);
    }
  });
});
