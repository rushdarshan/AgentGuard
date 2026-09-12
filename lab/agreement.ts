// Dataset-level inter-judge agreement (Cohen's kappa per judge PAIR, plus the
// unweighted mean over reportable pairs). Kappa is computed from INDIVIDUAL
// judge labels, never from fused outcomes, so a fused ABSTAIN does not discard
// a valid judge pair. The numeric thresholds below are project policy
// (conservative reporting rules), not universal mathematical requirements.
// A pair is reportable only if ALL hold:
//   1. >= MIN_PAIRED_CASES valid paired cases (policy: 5)
//   2. each judge in the pair shows both label classes across those cases (policy)
//   3. expected agreement < 1 (mathematical: kappa is undefined at == 1)
// Otherwise kappa is NA with an explicit reason code. Never a fabricated statistic.

export type AgreementLabel = "PASS" | "FAIL";

export interface JudgeLabelRecord {
  caseKey: string; // identity.key() of the case this label belongs to
  judgeId: string;
  label: AgreementLabel;
}

export type PairStatus =
  | "REPORTED"
  | "INSUFFICIENT_PAIRED_CASES"
  | "INSUFFICIENT_LABEL_VARIATION"
  | "UNDEFINED_EXPECTED_AGREEMENT";

export interface PairAgreement {
  judgeA: string;
  judgeB: string;
  nPaired: number;
  observedAgreement: number | null;
  expectedAgreement: number | null;
  kappa: number | null; // rounded to 4 decimals when REPORTED
  status: PairStatus;
}

export interface AgreementSummary {
  policy: { minPairedCases: number };
  pairs: PairAgreement[];
  meanPairwiseKappa: number | null; // unweighted mean over REPORTED pairs; null if none
  includedPairs: number;
  excludedPairs: number;
  // Cases excluded upstream (broken evidence chain) — reported, never scored.
  excludedBrokenEvidenceCases: string[];
}

export const MIN_PAIRED_CASES = 5;

export function computeAgreement(
  records: JudgeLabelRecord[],
  brokenEvidenceCases: string[] = [],
): AgreementSummary {
  const broken = new Set(brokenEvidenceCases);
  const seen = new Set<string>();
  for (const r of records) {
    if (broken.has(r.caseKey)) continue;
    const k = `${r.caseKey}\u0000${r.judgeId}`;
    if (seen.has(k)) throw new Error(`duplicate label for case ${r.caseKey} judge ${r.judgeId}`);
    seen.add(k);
  }

  const byJudge = new Map<string, Map<string, AgreementLabel>>();
  for (const r of records) {
    if (broken.has(r.caseKey)) continue;
    let m = byJudge.get(r.judgeId);
    if (!m) byJudge.set(r.judgeId, (m = new Map()));
    m.set(r.caseKey, r.label);
  }

  const judges = [...byJudge.keys()].sort();
  const pairs: PairAgreement[] = [];
  for (let i = 0; i < judges.length; i++) {
    for (let j = i + 1; j < judges.length; j++) {
      pairs.push(scorePair(judges[i], judges[j], byJudge.get(judges[i])!, byJudge.get(judges[j])!));
    }
  }

  const reported = pairs.filter((p) => p.status === "REPORTED");
  const mean =
    reported.length > 0
      ? +(reported.reduce((s, p) => s + (p.kappa ?? 0), 0) / reported.length).toFixed(4)
      : null;

  return {
    policy: { minPairedCases: MIN_PAIRED_CASES },
    pairs,
    meanPairwiseKappa: mean,
    includedPairs: reported.length,
    excludedPairs: pairs.length - reported.length,
    excludedBrokenEvidenceCases: [...broken].sort(),
  };
}

function scorePair(
  judgeA: string,
  judgeB: string,
  a: Map<string, AgreementLabel>,
  b: Map<string, AgreementLabel>,
): PairAgreement {
  const shared = [...a.keys()].filter((c) => b.has(c)).sort();
  const base = { judgeA, judgeB, nPaired: shared.length, observedAgreement: null, expectedAgreement: null, kappa: null };

  if (shared.length < MIN_PAIRED_CASES) return { ...base, status: "INSUFFICIENT_PAIRED_CASES" };

  const labelsA = shared.map((c) => a.get(c)!);
  const labelsB = shared.map((c) => b.get(c)!);
  const variation = (ls: AgreementLabel[]) => ls.includes("PASS") && ls.includes("FAIL");
  if (!variation(labelsA) || !variation(labelsB)) return { ...base, status: "INSUFFICIENT_LABEL_VARIATION" };

  const n = shared.length;
  const po = labelsA.filter((l, i) => l === labelsB[i]).length / n;
  const pA = labelsA.filter((l) => l === "PASS").length / n;
  const pB = labelsB.filter((l) => l === "PASS").length / n;
  const pe = pA * pB + (1 - pA) * (1 - pB);
  const observed = +po.toFixed(4);
  const expected = +pe.toFixed(4);

  // Mathematical: kappa's denominator is 1 - expected agreement.
  if (1 - pe < 1e-10) return { ...base, observedAgreement: observed, expectedAgreement: 1, status: "UNDEFINED_EXPECTED_AGREEMENT" };

  return { ...base, observedAgreement: observed, expectedAgreement: expected, kappa: +((po - pe) / (1 - pe)).toFixed(4), status: "REPORTED" };
}
