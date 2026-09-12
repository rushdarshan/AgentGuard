import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { canonicalStringify, sha256, type CaseExecution } from "./bundle.js";
import { EVALUATOR_INPUTS, evaluatorVersion, integrityCheck, replay } from "./replay.js";
import type { EvaluationResult } from "./verdict.js";

const PASS: EvaluationResult = { outcome: "PASS", reasonCode: "UNANIMOUS" };

function makeExec(tracePath = "trace.json"): CaseExecution {
  return {
    schemaVersion: 1,
    bundleId: "",
    experimentId: "exp",
    identity: { sourceCaseId: "s1", arm: "protected", seed: 7, scenario: "fam" },
    completedEvaluation: PASS,
    evidenceIntegrity: { status: "COMPLETE", findings: [] },
    result: "PASS",
    replayMode: "ARTIFACT_REPLAY",
    determinismClaim: "REPRODUCIBLE",
    agreementRef: null,
    provenance: [],
    input: {},
    observations: {},
    traces: [{ path: tracePath, digest: sha256("payload") }],
    assertions: [],
    environment: { nodeVersion: "v22", platform: "win32" },
    timestamps: { startedAt: "t0", finishedAt: "t1" },
    versions: { targetVersion: "sha", datasetVersion: "d", evaluatorVersion: "ev" },
  };
}

const stable = { rescore: () => PASS };
const flip = { rescore: () => ({ outcome: "FAIL", reasonCode: "X" }) as EvaluationResult };

describe("replay", () => {
  it("ARTIFACT_REPLAY passes on a stable rescore", () => {
    const r = replay(makeExec(), stable, { mode: "ARTIFACT_REPLAY" });
    expect(r.code).toBe("OK");
    expect(r.determinismClaim).toBe("REPRODUCIBLE");
  });

  it("REPLAY_MISMATCH when re-scoring changes the projection", () => {
    expect(replay(makeExec(), flip, { mode: "ARTIFACT_REPLAY" }).code).toBe("REPLAY_MISMATCH");
  });

  it("EVALUATOR_VERSION_MISMATCH is distinct from verdict mismatch", () => {
    const r = replay(makeExec(), stable, {
      mode: "ARTIFACT_REPLAY",
      currentEvaluatorVersion: "other",
    });
    expect(r.code).toBe("EVALUATOR_VERSION_MISMATCH");
  });

  it("INTERACTION_REPLAY fails clearly; FRESH_EXECUTION claims nothing", () => {
    expect(replay(makeExec(), stable, { mode: "INTERACTION_REPLAY" }).code).toBe(
      "UNSUPPORTED_REPLAY_MODE",
    );
    const fresh = replay(makeExec(), stable, { mode: "FRESH_EXECUTION" });
    expect(fresh.code).toBe("OK");
    expect(fresh.determinismClaim).toBe("NON_DETERMINISTIC");
  });
});

describe("integrityCheck", () => {
  it("catches a verdict-preserving byte tamper that replay alone would miss", () => {
    const dir = mkdtempSync(join(tmpdir(), "lab-replay-"));
    try {
      const exec = makeExec();
      // tampered bytes with the SAME digest recorded -> integrity fails,
      // while a stable rescorer would happily return OK.
      writeFileSync(join(dir, "trace.json"), "tampered payload");
      expect(integrityCheck(exec, dir)?.code).toBe("ARTIFACT_INTEGRITY_MISMATCH");
      expect(replay(exec, stable, { mode: "ARTIFACT_REPLAY" }).code).toBe("OK");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("passes when bytes match the recorded digest", () => {
    const dir = mkdtempSync(join(tmpdir(), "lab-replay-"));
    try {
      const exec = makeExec();
      writeFileSync(join(dir, "trace.json"), "payload");
      expect(integrityCheck(exec, dir)).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// sanity: the canonical projection is what replay compares, not raw JSON
it("canonicalStringify ignores property order", () => {
  expect(canonicalStringify({ a: 1, b: { c: 2, d: 3 } })).toBe(
    canonicalStringify({ b: { d: 3, c: 2 }, a: 1 }),
  );
});

describe("evaluatorVersion", () => {
  it("declares the scoring code and fixture sources as inputs", () => {
    expect(EVALUATOR_INPUTS).toContain("lab/experiments/destructive-command-relay.ts");
    expect(EVALUATOR_INPUTS).toContain("benchmarks/m0/attacks/destructive-command-relay/fixtures.ts");
    expect(EVALUATOR_INPUTS).toContain("lab/adapter.ts");
    expect(EVALUATOR_INPUTS).not.toContain("lab/report.ts");
    expect(EVALUATOR_INPUTS.every((f) => !f.endsWith(".test.ts"))).toBe(true);
  });

  it("changes when the oracle code or fixture content changes", () => {
    const root = process.cwd();
    const sandbox = mkdtempSync(join(tmpdir(), "lab-evalver-"));
    try {
      // Mirror the declared tree into a sandbox, hash, mutate, re-hash.
      for (const rel of EVALUATOR_INPUTS) {
        const src = join(root, ...rel.split("/"));
        const dst = join(sandbox, ...rel.split("/"));
        mkdirSync(dirname(dst), { recursive: true });
        writeFileSync(dst, readFileSync(src));
      }
      const before = evaluatorVersion(sandbox);
      expect(before).toBe(evaluatorVersion(root)); // sandbox mirrors the tree
      // Mutate the oracle file: one byte changes the version.
      const oracle = join(sandbox, "lab", "experiments", "destructive-command-relay.ts");
      writeFileSync(oracle, readFileSync(oracle, "utf8") + "\n// drift\n");
      expect(evaluatorVersion(sandbox)).not.toBe(before);
      // Restore oracle, mutate a fixture file instead.
      writeFileSync(oracle, readFileSync(join(root, "lab", "experiments", "destructive-command-relay.ts")));
      const fixture = join(sandbox, "benchmarks", "m0", "attacks", "destructive-command-relay", "fixtures.ts");
      writeFileSync(fixture, readFileSync(fixture, "utf8") + "\n// drift\n");
      expect(evaluatorVersion(sandbox)).not.toBe(before);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  it("refuses to version an incomplete input set", () => {
    const sandbox = mkdtempSync(join(tmpdir(), "lab-evalver-"));
    try {
      expect(() => evaluatorVersion(sandbox)).toThrow(/EVALUATOR_INPUT_MISSING/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
