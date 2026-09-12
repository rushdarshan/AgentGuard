// Evidence bundle: the central object of the Lab foundation. A reviewer must be
// able to trace release decision -> result -> assertions -> raw observations ->
// traces/artifacts -> exact experiment inputs + versions.
// Layout: results/lab/<experimentId>/<identityKey>.json + results/lab/index.jsonl.
// Versions are content hashes over the FULL declared input set via a sorted
// path+digest manifest (raw bytes; no ad-hoc comment stripping).
// targetVersion is the parent git SHA with the #142 caveat: untracked/modified
// files are NOT captured by it, so it is provenance, not integrity.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import type { EvaluationResult } from "./verdict.js";
import { deriveResult, type CaseResult } from "./verdict.js";
import { CaseIdentity, type CaseIdentityFields } from "./identity.js";

export const BUNDLE_SCHEMA_VERSION = 1;

export type ReplayMode = "ARTIFACT_REPLAY" | "INTERACTION_REPLAY" | "FRESH_EXECUTION";
export type DeterminismClaim = "REPRODUCIBLE" | "NON_DETERMINISTIC";
export type ProvenanceOrigin = "LIVE_CAPTURE" | "SYNTHETIC" | "HEURISTIC";

export interface JudgeLabelProvenance {
  judgeId: string;
  origin: ProvenanceOrigin;
  modelId: string | null; // null for keyless heuristic judges
  configHash: string | null;
  inputHash: string | null;
  rawResponse: string | null;
  parsedLabel: "PASS" | "FAIL" | "ABSTAIN" | "EVALUATOR_ERROR";
}

export interface EvidenceIntegrity {
  status: "COMPLETE" | "FAILED";
  findings: string[]; // empty when COMPLETE
}

export interface ArtifactDigest {
  path: string; // repo-relative, forward slashes
  digest: string; // sha256 hex of raw bytes
}

export interface BundleTimestamps {
  startedAt: string; // ISO wall-clock; EXCLUDED from the canonical projection
  finishedAt: string;
}

export interface CaseExecution {
  schemaVersion: number;
  bundleId: string; // content hash of this bundle without bundleId
  experimentId: string;
  identity: CaseIdentityFields;
  // Three-part case-result model (locked #212): the evaluation outcome and the
  // evidence-chain status are stored independently; `result` is derived.
  completedEvaluation: EvaluationResult | null; // null when no evaluation ran
  evidenceIntegrity: EvidenceIntegrity;
  result: CaseResult; // derived at write time via deriveResult; re-verified on read
  replayMode: ReplayMode;
  determinismClaim: DeterminismClaim;
  provenance: JudgeLabelProvenance[];
  input: unknown; // exact experiment inputs (fixture content, prompt, response)
  observations: unknown; // raw captured observations (M0 trace records)
  traces: ArtifactDigest[]; // captured trace artifacts + digests
  assertions: { name: string; passed: boolean }[];
  environment: { nodeVersion: string; platform: string };
  timestamps: BundleTimestamps;
  versions: { targetVersion: string; datasetVersion: string; evaluatorVersion: string };
  faultDemonstration?: string; // fault name when this is a designated demo record
}

export function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

// Sorted path+digest manifest over the declared input set. Deterministic and
// order-independent by construction.
export function manifestDigest(entries: ArtifactDigest[]): string {
  const sorted = [...entries].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return sha256(sorted.map((e) => `${e.path}\n${e.digest}\n`).join(""));
}

export function digestFiles(root: string, paths: string[]): ArtifactDigest[] {
  return paths.map((p) => ({ path: relative(root, p).split(sep).join("/"), digest: sha256(readFileSync(p)) }));
}

// Stable projection for replay determinism: verdict semantics + stable evidence
// refs + deterministic metadata. Excludes wall-clock timestamps, durations,
// attempt ids, and host paths. Key order is normalised recursively (JSON
// property-order noise cannot create false mismatches). RFC 8785 is the
// reference; no conformance is claimed without the conformance test.
export function canonicalProjection(exec: CaseExecution): string {
  const projection = {
    schemaVersion: exec.schemaVersion,
    identity: exec.identity,
    completedEvaluation: exec.completedEvaluation,
    evidenceIntegrity: exec.evidenceIntegrity,
    assertions: [...exec.assertions].sort((a, b) => (a.name < b.name ? -1 : 1)),
    evidenceRefs: exec.traces.map((t) => t.digest).sort(),
    versions: exec.versions,
    replayMode: exec.replayMode,
    faultDemonstration: exec.faultDemonstration ?? null,
  };
  return canonicalStringify(projection);
}

export function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`).join(",")}}`;
}

export function computeBundleId(exec: Omit<CaseExecution, "bundleId">): string {
  return sha256(canonicalStringify(exec));
}

export function bundlePath(resultsRoot: string, experimentId: string, identity: CaseIdentityFields): string {
  return join(resultsRoot, experimentId, `${new CaseIdentity(identity).key}.json`);
}

export function writeBundle(resultsRoot: string, exec: CaseExecution): string {
  const withId: CaseExecution = { ...exec };
  withId.bundleId = computeBundleId(withId);
  const path = bundlePath(resultsRoot, exec.experimentId, exec.identity);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(withId, null, 2) + "\n");

  const caseKey = new CaseIdentity(exec.identity).key;
  const index = join(resultsRoot, "index.jsonl");
  const lines = existsSync(index)
    ? readFileSync(index, "utf8").split("\n").filter((l) => l && JSON.parse(l).caseKey !== caseKey)
    : [];
  lines.push(
    JSON.stringify({
      bundleId: withId.bundleId,
      experimentId: exec.experimentId,
      caseKey,
      result: exec.result,
      faultDemonstration: exec.faultDemonstration ?? null,
      file: relative(resultsRoot, path).split(sep).join("/"),
    }),
  );
  mkdirSync(resultsRoot, { recursive: true });
  writeFileSync(index, lines.join("\n") + "\n");
  return withId.bundleId;
}

export function readBundle(path: string): CaseExecution {
  const exec = JSON.parse(readFileSync(path, "utf8")) as CaseExecution;
  if (exec.schemaVersion > BUNDLE_SCHEMA_VERSION) {
    throw new Error(`UNSUPPORTED_SCHEMA_VERSION: bundle declares ${exec.schemaVersion}, reader supports ${BUNDLE_SCHEMA_VERSION}`);
  }
  const derived = deriveResult(exec.completedEvaluation, exec.evidenceIntegrity);
  if (derived !== exec.result) {
    throw new Error(`STORED_RESULT_DRIFT: stored ${exec.result}, derived ${derived}`);
  }
  return exec;
}

export function listExperimentBundles(resultsRoot: string, experimentId: string): CaseExecution[] {
  const dir = join(resultsRoot, experimentId);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => readBundle(join(dir, f)));
}
