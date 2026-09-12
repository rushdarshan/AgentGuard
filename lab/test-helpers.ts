// Shared lab test factory. Kept out of any *.test.ts so importing it never
// re-registers suites in the importing file.
import { BUNDLE_SCHEMA_VERSION, sha256, type CaseExecution } from "./bundle.js";

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
    agreementRef: null,
    provenance: [
      {
        judgeId: "h-1",
        origin: "HEURISTIC",
        modelId: null,
        configHash: sha256("test-config"),
        inputHash: sha256("in"),
        rawResponse: "PASS",
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
