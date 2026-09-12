// Dataset-level inter-judge agreement (Cohen's kappa per judge PAIR, plus the
// unweighted mean over reported pairs). Kappa is computed from INDIVIDUAL judge
// labels, never from fused outcomes, so a fused ABSTAIN does not discard a
// valid judge pair. Pair-specific filtering happens INSIDE the analysis: every
// input record carries its label status, and every exclusion is reported with
// its reason per pair. The numeric thresholds below are project policy
// (conservative reporting rules), not universal mathematical requirements.
// A pair is reported only if ALL hold:
//   1. >= MIN_PAIRED_CASES valid paired cases (policy: 5)
//   2. each judge in the pair shows both label classes across those cases (policy)
//   3. expected agreement < 1 (mathematical: kappa is undefined at == 1)
// Otherwise kappa is NA with an explicit reason code. Never a fabricated statistic.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { canonicalStringify, sha256 } from "./bundle.js";

export type BinaryLabel = "PASS" | "FAIL";
// Every per-judge label status the analysis must account for. Only PASS/FAIL
// enter a pair's contingency table; every other status excludes the case from
// that pair with a named reason, counted and reported, never silently dropped.
export type JudgeLabelStatus = BinaryLabel | "ABSTAIN" | "EVALUATOR_ERROR" | "MISSING";

export interface JudgeLabelRecord {
  caseKey: string; // identity.key() of the case this label belongs to
  judgeId: string;
  label: JudgeLabelStatus;
  brokenEvidence: boolean; // true when the case's evidenceIntegrity.status is FAILED
}

export type PairStatus =
  | "REPORTED"
  | "INSUFFICIENT_PAIRED_CASES"
  | "INSUFFICIENT_LABEL_VARIATION"
  | "UNDEFINED_EXPECTED_AGREEMENT";

export type ExclusionReason = "NO_VALID_LABEL" | "JUDGE_ERROR" | "BROKEN_EVIDENCE" | "DUPLICATE_LABEL";

export interface PairExclusion {
  caseKey: string;
  reason: ExclusionReason;
  detail: string;
}

export interface PairAgreement {
  judgeA: string;
  judgeB: string;
  nPaired: number;
  observedAgreement: number | null;
  expectedAgreement: number | null;
  kappa: number | null; // rounded to 4 decimals when REPORTED
  status: PairStatus;
  contributingCaseIds: string[]; // exact case set behind the table, sorted
  contingency: { passPass: number; passFail: number; failPass: number; failFail: number };
  excluded: PairExclusion[];
}

export interface AgreementSummary {
  policy: { minPairedCases: number };
  pairs: PairAgreement[];
  meanPairwiseKappa: number | null; // unweighted mean over REPORTED pairs; null if none
  includedPairs: number;
  excludedPairs: number;
  evaluatorErrorCases: string[]; // cases carrying EVALUATOR_ERROR for some judge
  brokenEvidenceCases: string[]; // cases excluded for FAILED evidence
  excludedBrokenEvidenceCases: string[]; // backwards-compatible report name
}

export interface AgreementRecord {
  schemaVersion: 1;
  experimentId: string;
  summary: AgreementSummary;
}

export const AGREEMENT_RECORD_FILE = "agreement.json";
export const MIN_PAIRED_CASES = 5;

function exclusionFor(r: JudgeLabelRecord): ExclusionReason | null {
  if (r.brokenEvidence) return "BROKEN_EVIDENCE";
  if (r.label === "EVALUATOR_ERROR") return "JUDGE_ERROR";
  if (r.label === "ABSTAIN" || r.label === "MISSING") return "NO_VALID_LABEL";
  return null;
}

export function computeAgreement(records: JudgeLabelRecord[], brokenEvidenceCaseKeys: string[] = []): AgreementSummary {
  const brokenCases = new Set(brokenEvidenceCaseKeys);
  const normalizedRecords = records.map((record) =>
    brokenCases.has(record.caseKey) ? { ...record, brokenEvidence: true } : record,
  );
  // Production duplicate handling: a second label for the same (case, judge)
  // is not scored twice. The first record wins; later ones are excluded from
  // every pair with DUPLICATE_LABEL so the provenance stays visible.
  const firstByPair = new Map<string, JudgeLabelRecord>();
  const duplicates: JudgeLabelRecord[] = [];
  for (const r of normalizedRecords) {
    const k = `${r.caseKey}\u0000${r.judgeId}`;
    if (firstByPair.has(k)) duplicates.push(r);
    else firstByPair.set(k, r);
  }
  const deduped = [...firstByPair.values()];
  const dupKeys = new Set(duplicates.map((r) => `${r.caseKey}\u0000${r.judgeId}`));

  const byJudge = new Map<string, Map<string, JudgeLabelRecord>>();
  for (const r of deduped) {
    let m = byJudge.get(r.judgeId);
    if (!m) byJudge.set(r.judgeId, (m = new Map()));
    m.set(r.caseKey, r);
  }

  const judges = [...byJudge.keys()].sort();
  const pairs: PairAgreement[] = [];
  for (let i = 0; i < judges.length; i++) {
    for (let j = i + 1; j < judges.length; j++) {
      pairs.push(scorePair(judges[i], judges[j], byJudge.get(judges[i])!, byJudge.get(judges[j])!, dupKeys));
    }
  }

  const reported = pairs.filter((p) => p.status === "REPORTED");
  const mean =
    reported.length > 0
      ? +(reported.reduce((s, p) => s + (p.kappa ?? 0), 0) / reported.length).toFixed(4)
      : null;

  const evaluatorErrorCases = [
    ...new Set(deduped.filter((r) => r.label === "EVALUATOR_ERROR").map((r) => r.caseKey)),
  ].sort();
  const brokenEvidenceCases = [...new Set(normalizedRecords.filter((r) => r.brokenEvidence).map((r) => r.caseKey))].sort();

  return {
    policy: { minPairedCases: MIN_PAIRED_CASES },
    pairs,
    meanPairwiseKappa: mean,
    includedPairs: reported.length,
    excludedPairs: pairs.length - reported.length,
    evaluatorErrorCases,
    brokenEvidenceCases,
    excludedBrokenEvidenceCases: brokenEvidenceCases,
  };
}

function scorePair(
  judgeA: string,
  judgeB: string,
  a: Map<string, JudgeLabelRecord>,
  b: Map<string, JudgeLabelRecord>,
  dupKeys: Set<string>,
): PairAgreement {
  const caseKeys = [...new Set([...a.keys(), ...b.keys()])].sort();
  const excluded: PairExclusion[] = [];
  const validA = new Map<string, BinaryLabel>();
  const validB = new Map<string, BinaryLabel>();
  for (const c of caseKeys) {
    const ra = a.get(c);
    const rb = b.get(c);
    const problems: PairExclusion[] = [];
    for (const [r, judge] of [
      [ra, judgeA],
      [rb, judgeB],
    ] as const) {
      if (!r) {
        problems.push({ caseKey: c, reason: "NO_VALID_LABEL", detail: `${judge} has no record for this case` });
        continue;
      }
      if (dupKeys.has(`${c}\u0000${r.judgeId}`)) {
        problems.push({ caseKey: c, reason: "DUPLICATE_LABEL", detail: `${judge} labelled this case twice; first record wins` });
        continue;
      }
      const ex = exclusionFor(r);
      if (ex) {
        const detail =
          ex === "BROKEN_EVIDENCE"
            ? "case evidence chain FAILED"
            : ex === "JUDGE_ERROR"
              ? `${judge} recorded EVALUATOR_ERROR`
              : `${judge} recorded ${r.label}`;
        problems.push({ caseKey: c, reason: ex, detail });
      }
    }
    if (problems.length > 0) {
      excluded.push(...problems);
      continue;
    }
    validA.set(c, ra!.label as BinaryLabel);
    validB.set(c, rb!.label as BinaryLabel);
  }

  const shared = [...validA.keys()].filter((c) => validB.has(c)).sort();
  const zero = { passPass: 0, passFail: 0, failPass: 0, failFail: 0 };
  const base = {
    judgeA,
    judgeB,
    nPaired: shared.length,
    observedAgreement: null as number | null,
    expectedAgreement: null as number | null,
    kappa: null as number | null,
    contributingCaseIds: shared,
    contingency: zero,
    excluded,
  };

  if (shared.length < MIN_PAIRED_CASES) return { ...base, status: "INSUFFICIENT_PAIRED_CASES" };

  const labelsA = shared.map((c) => validA.get(c)!);
  const labelsB = shared.map((c) => validB.get(c)!);
  const contingency = { ...zero };
  for (let i = 0; i < shared.length; i++) {
    const key = `${labelsA[i] === "PASS" ? "pass" : "fail"}${labelsB[i] === "PASS" ? "Pass" : "Fail"}` as keyof typeof contingency;
    contingency[key]++;
  }
  const withTable = { ...base, contingency };

  const variation = (ls: BinaryLabel[]) => ls.includes("PASS") && ls.includes("FAIL");
  if (!variation(labelsA) || !variation(labelsB)) return { ...withTable, status: "INSUFFICIENT_LABEL_VARIATION" };

  const n = shared.length;
  const po = labelsA.filter((l, i) => l === labelsB[i]).length / n;
  const pA = labelsA.filter((l) => l === "PASS").length / n;
  const pB = labelsB.filter((l) => l === "PASS").length / n;
  const pe = pA * pB + (1 - pA) * (1 - pB);
  const observed = +po.toFixed(4);
  const expected = +pe.toFixed(4);

  // Mathematical: kappa's denominator is 1 - expected agreement.
  if (1 - pe < 1e-10) {
    return { ...withTable, observedAgreement: observed, expectedAgreement: 1, status: "UNDEFINED_EXPECTED_AGREEMENT" };
  }

  return {
    ...withTable,
    observedAgreement: observed,
    expectedAgreement: expected,
    kappa: +((po - pe) / (1 - pe)).toFixed(4),
    status: "REPORTED",
  };
}

// Agreement records carry no timestamps: identical case sets always serialize
// to identical bytes, so the committed record is byte-stable and directly
// comparable at verify time.
export function writeAgreementRecord(resultsRoot: string, experimentId: string, summary: AgreementSummary): string {
  const record: AgreementRecord = { schemaVersion: 1, experimentId, summary };
  const dir = join(resultsRoot, experimentId);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, AGREEMENT_RECORD_FILE);
  writeFileSync(path, JSON.stringify(record, null, 2) + "\n");
  return path;
}

export function readAgreementRecord(resultsRoot: string, experimentId: string): AgreementRecord {
  const path = join(resultsRoot, experimentId, AGREEMENT_RECORD_FILE);
  if (!existsSync(path)) throw new Error(`MISSING_AGREEMENT_RECORD: ${experimentId}/${AGREEMENT_RECORD_FILE} absent`);
  const record = JSON.parse(readFileSync(path, "utf8")) as AgreementRecord;
  if (record.schemaVersion !== 1 || record.experimentId !== experimentId || typeof record.summary !== "object") {
    throw new Error(`INVALID_AGREEMENT_RECORD: ${experimentId}/${AGREEMENT_RECORD_FILE} failed schema validation`);
  }
  return record;
}

export function agreementRecordDigest(record: AgreementRecord): string {
  return sha256(canonicalStringify(record));
}

export function agreementRecordPath(resultsRoot: string, experimentId: string): string {
  return join(resultsRoot, experimentId, AGREEMENT_RECORD_FILE);
}
