import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BUNDLE_SCHEMA_VERSION,
  canonicalProjection,
  canonicalStringify,
  computeBundleId,
  manifestDigest,
  readBundle,
  sha256,
  writeBundle,
  type CaseExecution,
} from "./bundle.js";
import { CaseIdentity } from "./identity.js";

export function makeExec(over: Partial<CaseExecution> = {}): CaseExecution {
  const identity = { sourceCaseId: "s1", arm: "protected", seed: 7, scenario: "fam" };
  return {
    schemaVersion: BUNDLE_SCHEMA_VERSION,
    bundleId: "",
    experimentId: "exp",
    identity,
    completedEvaluation: { outcome: "PASS", reasonCode: "UNANIMOUS" },
    evidenceIntegrity: { status: "COMPLETE", findings: [] },
    result: "PASS",
    replayMode: "ARTIFACT_REPLAY",
    determinismClaim: "REPRODUCIBLE",
    provenance: [
      {
        judgeId: "h-1",
        origin: "HEURISTIC",
        modelId: null,
        configHash: null,
        inputHash: sha256("in"),
        rawResponse: null,
        parsedLabel: "PASS",
      },
    ],
    input: { fixture: "f" },
    observations: { trace: "t" },
    traces: [],
    assertions: [{ name: "a", passed: true }],
    environment: { nodeVersion: "v22", platform: "win32" },
    timestamps: { startedAt: "2026-01-01T00:00:00Z", finishedAt: "2026-01-01T00:00:01Z" },
    versions: { targetVersion: "sha", datasetVersion: "d", evaluatorVersion: "e" },
    ...over,
  };
}

describe("manifest + canonicalisation", () => {
  it("manifestDigest is order-independent", () => {
    const a = { path: "a", digest: "1" };
    const b = { path: "b", digest: "2" };
    expect(manifestDigest([a, b])).toBe(manifestDigest([b, a]));
    expect(manifestDigest([a, b])).not.toBe(manifestDigest([a, { ...b, digest: "3" }]));
  });

  it("canonicalStringify normalises key order", () => {
    expect(canonicalStringify({ b: 1, a: 2 })).toBe(canonicalStringify({ a: 2, b: 1 }));
  });

  it("canonicalProjection excludes timestamps, environment and attempt metadata", () => {
    const base = canonicalProjection(makeExec());
    const moved = canonicalProjection(
      makeExec({
        timestamps: { startedAt: "2030-01-01T00:00:00Z", finishedAt: "2030-01-01T00:09:00Z" },
        environment: { nodeVersion: "v99", platform: "linux" },
      }),
    );
    expect(moved).toBe(base);
    const verdictChanged = canonicalProjection(
      makeExec({ completedEvaluation: { outcome: "FAIL", reasonCode: "X" }, result: "FAIL" }),
    );
    expect(verdictChanged).not.toBe(base);
  });
});

describe("CaseIdentity", () => {
  it("key is sourceCaseId+arm+seed+scenario, attemptId excluded", () => {
    const id = new CaseIdentity({ sourceCaseId: "s", arm: "a", seed: 1, scenario: "f" }, "attempt-9");
    expect(id.key).toBe("s__a__1__f");
    expect(new CaseIdentity(id.fields, "other").equals(id)).toBe(true);
  });

  it("rejects missing fields and non-integer seeds", () => {
    expect(() => new CaseIdentity({ sourceCaseId: "", arm: "a", seed: 1, scenario: "f" })).toThrow();
    expect(() => new CaseIdentity({ sourceCaseId: "s", arm: "a", seed: 1.5, scenario: "f" })).toThrow();
  });
});

describe("bundle write/read", () => {
  const root = mkdtempSync(join(tmpdir(), "lab-bundle-"));
  try {
    it("round-trips with stable content-hash bundleId and deduped index", () => {
      const exec = makeExec();
      const id1 = writeBundle(root, exec);
      const id2 = writeBundle(root, makeExec()); // same content, same identity
      expect(id1).toBe(id2);
      expect(id1).toBe(computeBundleId({ ...exec, bundleId: "" }));
      const index = readFileSync(join(root, "index.jsonl"), "utf8").trim().split("\n");
      expect(index).toHaveLength(1); // regeneration overwrites, no first-bundle-wins
      const back = readBundle(join(root, "exp", `${new CaseIdentity(exec.identity).key}.json`));
      expect(back.bundleId).toBe(id1);
    });

    it("rejects a stored result that drifts from the derived one", () => {
      const exec = makeExec();
      writeBundle(root, exec);
      const p = join(root, "exp", `${new CaseIdentity(exec.identity).key}.json`);
      const tampered = JSON.parse(readFileSync(p, "utf8"));
      tampered.result = "FAIL"; // completedEvaluation still PASS + COMPLETE evidence
      writeFileSync(p, JSON.stringify(tampered));
      expect(() => readBundle(p)).toThrow(/STORED_RESULT_DRIFT/);
    });

    it("rejects newer schema versions", () => {
      const exec = makeExec({ schemaVersion: BUNDLE_SCHEMA_VERSION + 1 });
      writeBundle(root, exec);
      const p = join(root, "exp", `${new CaseIdentity(exec.identity).key}.json`);
      expect(() => readBundle(p)).toThrow(/UNSUPPORTED_SCHEMA_VERSION/);
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
