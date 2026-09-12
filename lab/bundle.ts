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
// Write mode selects publication semantics. Generate replaces the canonical
// artifact for a case identity explicitly (regeneration). Verify and Replay
// never write canonical artifacts: a conflicting second record for an existing
// identity is rejected with both bundle ids named. There is no implicit
// "first bundle wins"; replacement happens only under Generate.
export type WriteMode = "generate" | "verify" | "replay";

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

// Dataset-level agreement referenced from each bundle so a reviewer can trace
// a statistic to the exact case set that produced it (agreement-analysis spec).
export interface AgreementRef {
  recordFile: string; // repo-relative path of the agreement record, forward slashes
  recordDigest: string; // sha256 of the canonical agreement record bytes
}

export interface BundleTimestamps {
  startedAt: string; // ISO wall-clock; EXCLUDED from the canonical projection
  finishedAt: string;
}

export interface CaseExecution {
  schemaVersion: number;
  bundleId: string; // content hash of this bundle excluding bundleId itself
  experimentId: string;
  identity: CaseIdentityFields;
  // Three-part case-result model (locked #212): the evaluation outcome and the
  // evidence-chain status are stored independently; `result` is derived.
  completedEvaluation: EvaluationResult | null; // null when no evaluation ran
  evidenceIntegrity: EvidenceIntegrity;
  result: CaseResult; // derived at write time via deriveResult; re-verified on read
  replayMode: ReplayMode;
  determinismClaim: DeterminismClaim;
  agreementRef: AgreementRef | null; // null only before the agreement record exists
  provenance: JudgeLabelProvenance[];
  input: unknown; // exact experiment inputs (fixture content, prompt, response)
  observations: unknown; // raw captured observations (M0 trace records)
  traces: ArtifactDigest[]; // captured trace artifacts + digests
  assertions: { name: string; passed: boolean }[];
  environment: { nodeVersion: string; platform: string };
  timestamps: BundleTimestamps;
  versions: { targetVersion: string; datasetVersion: string; evaluatorVersion: string };
  faultDemonstration?: string; // fault name when this is a designated demo record
  accepted?: boolean;
  execution?: { faultDemonstration?: string };
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
    agreementRef: exec.agreementRef,
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
  const { bundleId: _ignored, ...body } = exec as Omit<CaseExecution, "bundleId"> & {
    bundleId?: string;
  };
  void _ignored;
  return sha256(canonicalStringify(body));
}

// Stable bundle digest for drift comparison across regenerations. Volatile
// fields (bundleId, wall-clock timestamps) are excluded; everything else —
// including versions and the agreement reference — must match, so an
// unacknowledged methodology or input change fails the drift test and forces a
// deliberate re-baseline.
export function stableBundleDigest(exec: CaseExecution): string {
  const { bundleId: _id, timestamps: _ts, environment: _env, versions, ...stable } = exec;
  const { targetVersion: _target, ...stableVersions } = versions;
  void _id;
  void _ts;
  void _env;
  void _target;
  return sha256(canonicalStringify({ ...stable, versions: stableVersions }));
}

export function bundlePath(resultsRoot: string, experimentId: string, identity: CaseIdentityFields): string {
  return join(resultsRoot, experimentId, `${new CaseIdentity(identity).key}.json`);
}

export function writeBundle(resultsRoot: string, exec: CaseExecution, mode: WriteMode = "generate"): string {
  const { bundleId: _ignored, ...body } = exec;
  void _ignored;
  const bundleId = computeBundleId(body);
  const withId: CaseExecution = { ...exec, bundleId };
  const path = bundlePath(resultsRoot, exec.experimentId, exec.identity);
  if (mode !== "generate" && !existsSync(path)) {
    throw new Error(`READ_ONLY_WRITE_REJECTED: ${mode} cannot create ${path}`);
  }
  if (existsSync(path)) {
    const existingId = readBundleIdOnly(path);
    if (existingId === bundleId) return bundleId; // idempotent rewrite; write nothing
    if (mode !== "generate") {
      throw new Error(
        `DUPLICATE_IDENTITY_CONFLICT: ${mode} attempted a second record for case ${new CaseIdentity(exec.identity).key} ` +
          `in experiment ${exec.experimentId}; existing bundle ${existingId}, new bundle ${bundleId}; canonical artifact unchanged`,
      );
    }
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(withId, null, 2) + "\n");

  const caseKey = new CaseIdentity(exec.identity).key;
  const index = join(resultsRoot, "index.jsonl");
  const lines = existsSync(index)
    ? readFileSync(index, "utf8")
        .split("\n")
        .filter((l) => {
          if (!l) return false;
          const e = JSON.parse(l) as { experimentId?: string; caseKey?: string };
          return !(e.experimentId === exec.experimentId && e.caseKey === caseKey);
        })
    : [];
  lines.push(
    JSON.stringify({
      bundleId,
      experimentId: exec.experimentId,
      caseKey,
      result: exec.result,
      faultDemonstration: exec.faultDemonstration ?? null,
      file: relative(resultsRoot, path).split(sep).join("/"),
    }),
  );
  mkdirSync(resultsRoot, { recursive: true });
  writeFileSync(index, lines.join("\n") + "\n");
  return bundleId;
}

function readBundleIdOnly(path: string): string {
  try {
    return (JSON.parse(readFileSync(path, "utf8")) as { bundleId?: unknown }).bundleId as string;
  } catch {
    return "<unreadable>";
  }
}

const OUTCOMES = new Set(["PASS", "FAIL", "ABSTAIN", "EVALUATOR_ERROR"]);
const RESULTS = new Set(["PASS", "FAIL", "ABSTAIN", "EVALUATOR_ERROR", "INFRASTRUCTURE_ERROR"]);

// Runtime schema validation: bundles cross a trust boundary (disk), so reads
// validate structure instead of trusting a TypeScript cast.
export function validateCaseExecution(exec: unknown): asserts exec is CaseExecution {
  const fail = (d: string): never => {
    throw new Error(`INVALID_BUNDLE_SCHEMA: ${d}`);
  };
  if (exec === null || typeof exec !== "object" || Array.isArray(exec)) fail("bundle is not an object");
  const e = exec as Record<string, unknown>;
  if (typeof e.schemaVersion !== "number") fail("schemaVersion is not a number");
  if (typeof e.bundleId !== "string" || !e.bundleId) fail("bundleId is not a non-empty string");
  if (typeof e.experimentId !== "string" || !e.experimentId) fail("experimentId is not a non-empty string");
  const env = e.environment as Record<string, unknown> | undefined;
  if (typeof env?.nodeVersion !== "string" || !env.nodeVersion || typeof env?.platform !== "string" || !env.platform) {
    fail("environment must carry nodeVersion/platform strings");
  }
  const ts = e.timestamps as Record<string, unknown> | undefined;
  if (typeof ts?.startedAt !== "string" || !ts.startedAt || typeof ts?.finishedAt !== "string" || !ts.finishedAt) {
    fail("timestamps must carry startedAt/finishedAt strings");
  }
  try {
    new CaseIdentity(e.identity as CaseIdentityFields);
  } catch (err) {
    fail(`identity: ${(err as Error).message}`);
  }
  const ce = e.completedEvaluation;
  if (ce !== null) {
    if (typeof ce !== "object" || Array.isArray(ce)) fail("completedEvaluation is neither null nor object");
    const o = (ce as { outcome?: unknown; reasonCode?: unknown }).outcome;
    const r = (ce as { outcome?: unknown; reasonCode?: unknown }).reasonCode;
    if (!OUTCOMES.has(o as string)) fail(`completedEvaluation.outcome ${String(o)} not in PASS/FAIL/ABSTAIN/EVALUATOR_ERROR`);
    if (typeof r !== "string" || !r) fail("completedEvaluation.reasonCode is not a non-empty string");
  }
  const ei = e.evidenceIntegrity as { status?: unknown; findings?: unknown } | undefined;
  if (ei?.status !== "COMPLETE" && ei?.status !== "FAILED") fail("evidenceIntegrity.status not in COMPLETE/FAILED");
  if (!Array.isArray(ei?.findings) || !(ei?.findings as unknown[]).every((f) => typeof f === "string")) {
    fail("evidenceIntegrity.findings is not a string array");
  }
  if (!RESULTS.has(e.result as string)) fail(`result ${String(e.result)} not one of the five locked states`);
  if (!["ARTIFACT_REPLAY", "INTERACTION_REPLAY", "FRESH_EXECUTION"].includes(e.replayMode as string)) {
    fail(`replayMode ${String(e.replayMode)} unknown`);
  }
  if (!["REPRODUCIBLE", "NON_DETERMINISTIC"].includes(e.determinismClaim as string)) {
    fail(`determinismClaim ${String(e.determinismClaim)} unknown`);
  }
  for (const field of ["input", "observations", "agreementRef"] as const) {
    if (!Object.prototype.hasOwnProperty.call(e, field)) fail(`${field} is required`);
  }
  if (e.agreementRef !== null) {
    const ar = e.agreementRef as Record<string, unknown>;
    if (typeof ar !== "object" || typeof ar.recordFile !== "string" || !ar.recordFile || typeof ar.recordDigest !== "string" || !ar.recordDigest) {
      fail("agreementRef must be null or carry recordFile/recordDigest strings");
    }
  }
  if (!Array.isArray(e.provenance)) fail("provenance is not an array");
  for (const p of e.provenance as Record<string, unknown>[]) {
    if (typeof p.judgeId !== "string" || !p.judgeId) fail("provenance judgeId missing");
    if (!["LIVE_CAPTURE", "SYNTHETIC", "HEURISTIC"].includes(p.origin as string)) fail(`provenance origin ${String(p.origin)} unknown`);
    if (!["PASS", "FAIL", "ABSTAIN", "EVALUATOR_ERROR"].includes(p.parsedLabel as string)) {
      fail(`provenance parsedLabel ${String(p.parsedLabel)} unknown`);
    }
    // Presence is not enough: null or empty evidence values fail. modelId is
    // the only nullable provenance field (null = keyless heuristic judge).
    for (const field of ["configHash", "inputHash", "rawResponse"] as const) {
      if (typeof p[field] !== "string" || !(p[field] as string)) fail(`provenance ${field} must be a non-empty string`);
    }
    if (p.modelId !== null && (typeof p.modelId !== "string" || !p.modelId)) fail("provenance modelId must be null or a non-empty string");
  }
  if (!Array.isArray(e.traces)) fail("traces is not an array");
  for (const t of e.traces as Record<string, unknown>[]) {
    if (typeof t.path !== "string" || typeof t.digest !== "string") fail("trace entry lacks path/digest strings");
  }
  if (!Array.isArray(e.assertions)) fail("assertions is not an array");
  const v = e.versions as Record<string, unknown> | undefined;
  if (typeof v?.targetVersion !== "string" || typeof v?.datasetVersion !== "string" || typeof v?.evaluatorVersion !== "string") {
    fail("versions must carry targetVersion/datasetVersion/evaluatorVersion strings");
  }
  if (e.faultDemonstration !== undefined && typeof e.faultDemonstration !== "string") fail("faultDemonstration not a string");
  if (e.accepted !== undefined && typeof e.accepted !== "boolean") fail("accepted is not a boolean");
  if (e.execution !== undefined && (typeof e.execution !== "object" || e.execution === null)) {
    fail("execution is not an object");
  }
}

export function readBundle(path: string): CaseExecution {
  const exec = JSON.parse(readFileSync(path, "utf8")) as CaseExecution;
  if (exec.schemaVersion > BUNDLE_SCHEMA_VERSION) {
    throw new Error(`UNSUPPORTED_SCHEMA_VERSION: bundle declares ${exec.schemaVersion}, reader supports ${BUNDLE_SCHEMA_VERSION}`);
  }
  validateCaseExecution(exec);
  const derived = deriveResult(exec.completedEvaluation, exec.evidenceIntegrity);
  if (derived !== exec.result) {
    throw new Error(`STORED_RESULT_DRIFT: stored ${exec.result}, derived ${derived}`);
  }
  const { bundleId: stored, ...body } = exec;
  if (computeBundleId(body) !== stored) {
    throw new Error(`BUNDLE_ID_MISMATCH: stored ${stored} does not match recomputed digest; bundle was modified outside Generate`);
  }
  return exec;
}

// Production evidence validation: the check the pipeline runs over every case
// (and the check fault injection must trigger, not bypass). Trace artifacts
// must exist under resultsDir and match their recorded digests. The evaluation
// is never rewritten here; absence or corruption yields FAILED integrity.
export function checkEvidenceIntegrity(
  exec: Pick<CaseExecution, "traces">,
  resultsDir: string = "__absent__",
): EvidenceIntegrity {
  const findings: string[] = [];
  if (exec.traces.length === 0) {
    findings.push("MISSING_TRACE: no trace artifacts recorded for this case");
  }
  for (const t of exec.traces) {
    const abs = join(resultsDir, t.path);
    if (!existsSync(abs)) {
      findings.push(`MISSING_TRACE: ${t.path} absent`);
      continue;
    }
    if (sha256(readFileSync(abs)) !== t.digest) {
      findings.push(`ARTIFACT_INTEGRITY_MISMATCH: ${t.path} bytes differ from recorded digest`);
    }
  }
  return findings.length === 0 ? { status: "COMPLETE", findings: [] } : { status: "FAILED", findings };
}

export function listExperimentBundles(resultsRoot: string, experimentId: string): CaseExecution[] {
  const dir = join(resultsRoot, experimentId);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json") && f !== "agreement.json" && f !== "model-verdicts.json")
    .sort()
    .map((f) => readBundle(join(dir, f)));
}
