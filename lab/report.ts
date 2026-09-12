// REPORT.md generator. The report is generated from committed bundles with
// zero hand-authored numbers and protected by the regeneration drift test.
// Null numerics render as NA with the reason named, never as a dash or zero.

import { EXPERIMENT_ID, FAMILY, JUDGES } from "./experiments/destructive-command-relay.js";
import { verifyFaultDemo } from "./faults.js";
import { CaseIdentity } from "./identity.js";
import type { AgreementSummary, PairAgreement } from "./agreement.js";
import { computeAgreement, type JudgeLabelRecord } from "./agreement.js";
import type { CaseExecution } from "./bundle.js";
import type { SliceSummary } from "./experiments/destructive-command-relay.js";

export interface ReportInput {
  executions: CaseExecution[];
  demos: CaseExecution[];
  replay: { verified: number; failures: string[] };
}

const num = (v: number | null): string => (v === null ? "NA" : String(v));

function exclusionCounts(p: PairAgreement): string {
  if (p.excluded.length === 0) return "0";
  const counts = new Map<string, number>();
  for (const e of p.excluded) counts.set(e.reason, (counts.get(e.reason) ?? 0) + 1);
  const parts = [...counts.entries()].map(([r, n]) => `${r}×${n}`);
  return `${p.excluded.length} (${parts.join(", ")})`;
}

function pairLine(p: PairAgreement): string {
  return `| ${p.judgeA} vs ${p.judgeB} | ${num(p.kappa)} | ${num(p.observedAgreement)} | ${num(p.expectedAgreement)} | ${p.nPaired} | ${p.contributingCaseIds.length} | ${p.status} | ${exclusionCounts(p)} |`;
}

export function agreementFromExecutions(executions: CaseExecution[]): AgreementSummary {
  const records: JudgeLabelRecord[] = executions.flatMap((exec) => {
    const key = new CaseIdentity(exec.identity).key;
    const brokenEvidence = exec.evidenceIntegrity.status === "FAILED";
    return JUDGES.map((judgeId): JudgeLabelRecord => {
      const p = exec.provenance.find((q) => q.judgeId === judgeId);
      if (!p) return { caseKey: key, judgeId, label: "MISSING", brokenEvidence };
      return { caseKey: key, judgeId, label: p.parsedLabel as JudgeLabelRecord["label"], brokenEvidence };
    });
  });
  return computeAgreement(records);
}

export function renderReport(input: ReportInput | SliceSummary): string {
  if ("replayVerified" in input) {
    input = {
      executions: input.executions,
      demos: [],
      replay: { verified: input.replayVerified, failures: input.replayFailures },
    };
  }
  const { executions, demos, replay } = input;
  const agreement = agreementFromExecutions(executions);
  const results: Record<string, number> = {};
  for (const e of executions) results[e.result] = (results[e.result] ?? 0) + 1;
  const first = executions[0];
  const lines: string[] = [];
  lines.push(`# AgentGuard Lab - ${EXPERIMENT_ID}`);
  lines.push(``);
  lines.push(`Family: ${FAMILY}. Cases: ${executions.length}. Judges: ${JUDGES.join(", ")}.`);
  lines.push(``);
  lines.push(`## Claim boundary`);
  lines.push(`This report demonstrates reproducible evaluation semantics: verdicts, agreement, and replay are`);
  lines.push(`recomputable from the committed evidence. It makes no claim about real-world attack-prevention`);
  lines.push(`performance, and it reports no calibrated-abstention results: the abstention machinery exists,`);
  lines.push(`the study does not. Agreement below is heuristic-vs-heuristic under keyless reproduction: it`);
  lines.push(`measures consistency between two deterministic rules, not reliability between independent models.`);
  lines.push(``);
  lines.push(`## Per-case results`);
  lines.push(`| case | evaluation | evidence | result |`);
  lines.push(`| --- | --- | --- | --- |`);
  const sorted = [...executions].sort((a, b) =>
    new CaseIdentity(a.identity).key < new CaseIdentity(b.identity).key ? -1 : 1,
  );
  for (const e of sorted) {
    lines.push(
      `| ${new CaseIdentity(e.identity).key} | ${e.completedEvaluation?.outcome ?? "none"} | ${e.evidenceIntegrity.status} | ${e.result} |`,
    );
  }
  lines.push(``);
  lines.push(`Result counts: ${Object.entries(results).map(([k, v]) => `${k}=${v}`).join(", ")}.`);
  lines.push(``);
  lines.push(`## Agreement (dataset-level, individual judge labels)`);
  lines.push(`| pair | kappa | observed | expected | paired | contributing | status | excluded |`);
  lines.push(`| --- | --- | --- | --- | --- | --- | --- | --- |`);
  for (const p of agreement.pairs) lines.push(pairLine(p));
  lines.push(``);
  lines.push(
    `meanPairwiseKappa: ${agreement.meanPairwiseKappa === null ? "NA (no REPORTED pairs)" : String(agreement.meanPairwiseKappa)} ` +
      `(included pairs: ${agreement.includedPairs}, excluded pairs: ${agreement.excludedPairs}).`,
  );
  lines.push(
    `Policy: numeric kappa is withheld below ${agreement.policy.minPairedCases} valid paired cases ` +
      `(INSUFFICIENT_PAIRED_CASES) or without both label classes per judge (INSUFFICIENT_LABEL_VARIATION); ` +
      `these are project reporting rules, not mathematical requirements, and five cases are not evidence of precision.`,
  );
  if (agreement.evaluatorErrorCases.length > 0) {
    lines.push(`Cases with evaluator errors: ${agreement.evaluatorErrorCases.join(", ")}.`);
  }
  if (agreement.brokenEvidenceCases.length > 0) {
    lines.push(`Cases excluded for broken evidence: ${agreement.brokenEvidenceCases.join(", ")}.`);
  }
  lines.push(``);
  lines.push(`## Replay determinism`);
  lines.push(`Artifact replay re-scores captured observations through the evaluator; no target re-execution.`);
  lines.push(`Verified: ${replay.verified}/${executions.length} bundles re-scored to an identical canonical projection.`);
  for (const f of replay.failures) lines.push(`- FAIL: ${f}`);
  lines.push(`INTERACTION_REPLAY is deferred to a follow-on change: requests fail with UNSUPPORTED_REPLAY_MODE.`);
  lines.push(`FRESH_EXECUTION is the existing path and is explicitly non-deterministic.`);
  lines.push(``);
  lines.push(`## Fault demonstrations`);
  if (demos.length === 0) {
    lines.push(`No fault-demonstration records committed. Generate with --faults to record the five minimal faults.`);
  } else {
    lines.push(`| fault | detected | detail | bundle |`);
    lines.push(`| --- | --- | --- | --- |`);
    const ordered = [...demos].sort((a, b) => String(a.faultDemonstration) < String(b.faultDemonstration) ? -1 : 1);
    for (const d of ordered) {
      const check = verifyFaultDemo(d);
      lines.push(`| ${d.faultDemonstration} | ${check.accepted ? "yes" : "NO"} | ${check.reason} | ${d.bundleId.slice(0, 12)} |`);
    }
    lines.push(`Demonstration records are flagged in metadata and excluded from the slice statistics above.`);
  }
  lines.push(``);
  lines.push(`## Versions and provenance`);
  if (first) {
    lines.push(`- evaluatorVersion: ${first.versions.evaluatorVersion} (content hash over the declared evaluator input set)`);
    lines.push(`- datasetVersion: ${first.versions.datasetVersion} (M0 trace digest for family ${FAMILY})`);
    lines.push(`- targetVersion: ${first.versions.targetVersion} (parent git SHA; caveat: a commit cannot contain its own SHA,`);
    lines.push(`  and untracked or modified working-tree files are not captured by it (provenance, not integrity))`);
    lines.push(`- agreement record: ${first.agreementRef?.recordFile ?? "none"} (digest ${first.agreementRef?.recordDigest.slice(0, 12) ?? "none"})`);
  }
  lines.push(`- label provenance: every recorded label carries origin, judgeId, config/input hashes, raw response, parsed label`);
  lines.push(``);
  return lines.join("\n");
}
