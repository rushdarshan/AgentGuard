// Replay semantics. replayMode (what was re-run) is separate from
// determinismClaim (what is asserted about the output).
//   ARTIFACT_REPLAY   : re-score captured observations. Implemented.
//   INTERACTION_REPLAY: re-drive the agent against a mock. Deferred; requests
//                       fail clearly with UNSUPPORTED_REPLAY_MODE.
//   FRESH_EXECUTION   : the existing path, explicitly labelled NON_DETERMINISTIC.
//
// Integrity vs reproducibility are DISTINCT failures:
//   ARTIFACT_INTEGRITY_MISMATCH : a captured artifact no longer matches its
//       recorded digest. The verdict may be unchanged; the evidence chain is
//       broken regardless. Note the honest limit: a bundle is self-authenticated
//       by its own hashes, so an attacker who edits an artifact AND its digest
//       defeats this check — external anchoring (git, signed manifests) is the
//       upgrade path.
//   REPLAY_MISMATCH             : artifacts are intact but re-scoring produced
//       a different canonical projection.
//   EVALUATOR_VERSION_MISMATCH  : current evaluator code hash differs from the
//       recorded evaluatorVersion.
//   UNSUPPORTED_SCHEMA_VERSION  : bundle newer than the reader.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalProjection, manifestDigest, sha256, type ArtifactDigest, type CaseExecution, type DeterminismClaim, type ReplayMode } from "./bundle.js";
import type { EvaluationResult } from "./verdict.js";

export type ReplayCode =
  | "OK"
  | "ARTIFACT_INTEGRITY_MISMATCH"
  | "REPLAY_MISMATCH"
  | "EVALUATOR_VERSION_MISMATCH"
  | "UNSUPPORTED_REPLAY_MODE";

export interface ReplayOutcome {
  code: ReplayCode;
  determinismClaim: DeterminismClaim;
  detail: string;
  reScored: EvaluationResult | null;
}

export interface Rescorer {
  // Re-scores the bundle's captured observations into a fresh EvaluationResult.
  rescore(exec: CaseExecution): EvaluationResult;
}

export function evaluatorVersion(): string {
  // Content hash over the evaluator's declared input set (the lab/ sources it
  // runs). Sorted path+digest manifest, raw bytes.
  const files = ["adapter.ts", "agreement.ts", "bundle.ts", "faults.ts", "identity.ts", "replay.ts", "verdict.ts"];
  const entries: ArtifactDigest[] = files.map((f) => {
    const abs = join(process.cwd(), "lab", f);
    return { path: `lab/${f}`, digest: sha256(readFileSync(abs)) };
  });
  return manifestDigest(entries);
}

export function verifyArtifacts(exec: CaseExecution, resultsDir: string): string | null {
  for (const t of exec.traces) {
    const got = sha256(readFileSync(join(resultsDir, t.path)));
    if (got !== t.digest) return `ARTIFACT_INTEGRITY_MISMATCH: ${t.path}`;
  }
  return null;
}

export function replay(
  exec: CaseExecution,
  rescorer: Rescorer,
  opts: { mode: ReplayMode; currentEvaluatorVersion?: string },
): ReplayOutcome {
  const claim: DeterminismClaim = opts.mode === "FRESH_EXECUTION" ? "NON_DETERMINISTIC" : "REPRODUCIBLE";

  if (opts.mode === "INTERACTION_REPLAY") {
    return { code: "UNSUPPORTED_REPLAY_MODE", determinismClaim: claim, detail: "INTERACTION_REPLAY is deferred in this change", reScored: null };
  }
  if (opts.mode === "FRESH_EXECUTION") {
    return { code: "OK", determinismClaim: "NON_DETERMINISTIC", detail: "fresh execution is explicitly non-deterministic; no replay assertion", reScored: null };
  }

  if (opts.currentEvaluatorVersion && opts.currentEvaluatorVersion !== exec.versions.evaluatorVersion) {
    return {
      code: "EVALUATOR_VERSION_MISMATCH",
      determinismClaim: claim,
      detail: `recorded ${exec.versions.evaluatorVersion.slice(0, 12)} != current ${opts.currentEvaluatorVersion.slice(0, 12)}`,
      reScored: null,
    };
  }

  const reScored = rescorer.rescore(exec);
  const before = canonicalProjection(exec);
  const after = canonicalProjection({ ...exec, completedEvaluation: reScored });
  if (before !== after) {
    return { code: "REPLAY_MISMATCH", determinismClaim: claim, detail: "canonical projection differs after re-scoring", reScored };
  }
  return { code: "OK", determinismClaim: claim, detail: "canonical projection identical", reScored };
}

// Distinct from replay: integrity is about the bytes, not the verdict.
// Runs BEFORE re-scoring; a verdict-preserving tamper still fails here.
export function integrityCheck(exec: CaseExecution, resultsDir: string): ReplayOutcome | null {
  const bad = verifyArtifacts(exec, resultsDir);
  if (!bad) return null;
  return { code: "ARTIFACT_INTEGRITY_MISMATCH", determinismClaim: "REPRODUCIBLE", detail: bad, reScored: null };
}

export function hashOf(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}
