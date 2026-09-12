import { readFileSync, rmSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  BUNDLE_SCHEMA_VERSION,
  canonicalProjection,
  canonicalStringify,
  checkEvidenceIntegrity,
  computeBundleId,
  manifestDigest,
  readBundle,
  sha256,
  writeBundle,
} from "./bundle.js";
import { CaseIdentity } from "./identity.js";
import { makeExec } from "./test-helpers.js";

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
  let root: string;
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "lab-bundle-"));
  });
  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("round-trips with stable content-hash bundleId and deduped index", () => {
    const exec = makeExec();
    const id1 = writeBundle(root, exec);
    const id2 = writeBundle(root, makeExec()); // same content, same identity
    expect(id1).toBe(id2);
    const { bundleId: _drop, ...body } = exec;
    void _drop;
    expect(id1).toBe(computeBundleId(body));
    const index = readFileSync(join(root, "index.jsonl"), "utf8").trim().split("\n");
    expect(index).toHaveLength(1); // identical rewrite is idempotent
    const back = readBundle(join(root, "exp", `${new CaseIdentity(exec.identity).key}.json`));
    expect(back.bundleId).toBe(id1);
  });

  it("rejects a stored result that drifts from the derived one", () => {
    const exec = makeExec({ identity: { sourceCaseId: "drift", arm: "protected", seed: 8, scenario: "fam" } });
    writeBundle(root, exec);
    const p = join(root, "exp", `${new CaseIdentity(exec.identity).key}.json`);
    const tampered = JSON.parse(readFileSync(p, "utf8"));
    tampered.result = "FAIL"; // completedEvaluation still PASS + COMPLETE evidence
    writeFileSync(p, JSON.stringify(tampered));
    expect(() => readBundle(p)).toThrow(/STORED_RESULT_DRIFT/);
  });

  it("rejects newer schema versions", () => {
    const exec = makeExec({
      schemaVersion: BUNDLE_SCHEMA_VERSION + 1,
      identity: { sourceCaseId: "future", arm: "protected", seed: 9, scenario: "fam" },
    });
    writeBundle(root, exec);
    const p = join(root, "exp", `${new CaseIdentity(exec.identity).key}.json`);
    expect(() => readBundle(p)).toThrow(/UNSUPPORTED_SCHEMA_VERSION/);
  });
});

describe("bundle identity integrity", () => {
  let root: string;
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "lab-bundleid-"));
  });
  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("computeBundleId excludes a stale bundleId", () => {
    const exec = makeExec();
    const { bundleId: _drop, ...body } = exec;
    void _drop;
    const id = computeBundleId(body);
    // A stale id carried on the object must not change the digest.
    expect(computeBundleId({ ...body, bundleId: "stale-id" } as never)).toBe(id);
    const written = writeBundle(root, { ...exec, bundleId: "stale-id" });
    expect(written).toBe(id);
  });

  it("readBundle rejects a bundle whose bytes were modified after writing", () => {
    const exec = makeExec({ identity: { sourceCaseId: "tamper", arm: "protected", seed: 10, scenario: "fam" } });
    writeBundle(root, exec);
    const p = join(root, "exp", `${new CaseIdentity(exec.identity).key}.json`);
    const tampered = JSON.parse(readFileSync(p, "utf8"));
    // Verdict-preserving tamper: the id check must still fail.
    tampered.assertions = [];
    writeFileSync(p, JSON.stringify(tampered));
    expect(() => readBundle(p)).toThrow(/BUNDLE_ID_MISMATCH/);
  });

  it("readBundle rejects structurally invalid bundles", () => {
    const p = join(root, "exp", "bogus.json");
    writeFileSync(p, JSON.stringify({ schemaVersion: 1, bundleId: "x" }));
    expect(() => readBundle(p)).toThrow(/INVALID_BUNDLE_SCHEMA/);
  });
});

describe("write modes and duplicate publication", () => {
  let root: string;
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "lab-modes-"));
  });
  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("generate replaces the canonical artifact for a case identity", () => {
    const exec = makeExec();
    const id1 = writeBundle(root, exec, "generate");
    const id2 = writeBundle(root, makeExec({ input: { fixture: "changed" } }), "generate");
    expect(id2).not.toBe(id1);
    expect(readBundle(join(root, "exp", `${new CaseIdentity(exec.identity).key}.json`)).bundleId).toBe(id2);
  });

  it("verify and replay reject a conflicting second record naming both bundles", () => {
    const exec = makeExec({ identity: { sourceCaseId: "conflict", arm: "protected", seed: 11, scenario: "fam" } });
    const id1 = writeBundle(root, exec, "generate");
    const changed = makeExec({
      identity: { sourceCaseId: "conflict", arm: "protected", seed: 11, scenario: "fam" },
      input: { fixture: "changed" },
    });
    const { bundleId: _d, ...body } = changed;
    void _d;
    const id2 = computeBundleId(body);
    for (const mode of ["verify", "replay"] as const) {
      expect(() => writeBundle(root, changed, mode)).toThrow(/DUPLICATE_IDENTITY_CONFLICT/);
      try {
        writeBundle(root, changed, mode);
      } catch (e) {
        expect((e as Error).message).toContain(id1);
        expect((e as Error).message).toContain(id2);
      }
    }
    // The canonical artifact is unchanged.
    expect(readBundle(join(root, "exp", `${new CaseIdentity(exec.identity).key}.json`)).bundleId).toBe(id1);
  });

  it("identical rewrite outside generate is idempotent and writes nothing new", () => {
    const exec = makeExec({ identity: { sourceCaseId: "idem", arm: "protected", seed: 12, scenario: "fam" } });
    const id1 = writeBundle(root, exec, "generate");
    const back = readBundle(join(root, "exp", `${new CaseIdentity(exec.identity).key}.json`));
    const before = readFileSync(join(root, "exp", `${new CaseIdentity(exec.identity).key}.json`), "utf8");
    expect(writeBundle(root, back, "verify")).toBe(id1);
    expect(readFileSync(join(root, "exp", `${new CaseIdentity(exec.identity).key}.json`), "utf8")).toBe(before);
  });

  it("index entries are keyed by experiment plus case", () => {
    const a = makeExec({ experimentId: "exp-a" });
    const b = makeExec({ experimentId: "exp-b" });
    writeBundle(root, a, "generate");
    writeBundle(root, b, "generate");
    const lines = readFileSync(join(root, "index.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    const keys = lines.map((l) => `${l.experimentId}\u0000${l.caseKey}`);
    expect(keys).toContain(`exp-a\u0000${new CaseIdentity(a.identity).key}`);
    expect(keys).toContain(`exp-b\u0000${new CaseIdentity(b.identity).key}`);
  });
});

describe("checkEvidenceIntegrity", () => {
  let root: string;
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "lab-evidence-"));
  });
  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("COMPLETE when every artifact exists and matches", () => {
    writeFileSync(join(root, "trace.json"), "payload");
    const status = checkEvidenceIntegrity({ traces: [{ path: "trace.json", digest: sha256("payload") }] }, root);
    expect(status).toEqual({ status: "COMPLETE", findings: [] });
  });

  it("discovers a removed artifact as MISSING_TRACE", () => {
    writeFileSync(join(root, "gone.json"), "payload");
    const digest = sha256("payload");
    rmSync(join(root, "gone.json"));
    const status = checkEvidenceIntegrity({ traces: [{ path: "gone.json", digest }] }, root);
    expect(status.status).toBe("FAILED");
    expect(status.findings.some((f) => f.startsWith("MISSING_TRACE"))).toBe(true);
  });

  it("flags a verdict-preserving byte tamper as ARTIFACT_INTEGRITY_MISMATCH", () => {
    writeFileSync(join(root, "edit.json"), "tampered payload");
    const status = checkEvidenceIntegrity({ traces: [{ path: "edit.json", digest: sha256("payload") }] }, root);
    expect(status.status).toBe("FAILED");
    expect(status.findings.some((f) => f.startsWith("ARTIFACT_INTEGRITY_MISMATCH"))).toBe(true);
  });

  it("empty trace list is MISSING_TRACE, not silent COMPLETE", () => {
    const status = checkEvidenceIntegrity({ traces: [] }, root);
    expect(status.status).toBe("FAILED");
    expect(status.findings.some((f) => f.startsWith("MISSING_TRACE"))).toBe(true);
  });
});
