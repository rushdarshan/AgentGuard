import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { FIXTURES } from "../../benchmarks/m0/attacks/index.js";
import type { Trace } from "../../benchmarks/m0/types.js";
import { canonicalProjection, digestFiles } from "../bundle.js";
import { CaseIdentity } from "../identity.js";
import {
  FAMILY,
  TRACES_PATH,
  buildExecution,
  rescore,
  runSlice,
  textRuleLabel,
  verifyObservationLineage,
  type SliceSummary,
} from "./destructive-command-relay.js";

const agentRoot = process.cwd();
const tracesFile = join(agentRoot, TRACES_PATH);
const hasTraces = existsSync(tracesFile);

// The slice consumes committed M0 observations; without them there is nothing
// to verify (same convention as benchmarks/m0/m0-table.test.ts).
const suite = hasTraces ? describe : describe.skip;

function familyTraces(): Trace[] {
  return readFileSync(tracesFile, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Trace)
    .filter((t) => t.family === FAMILY);
}

suite("destructive-command-relay slice", () => {
  let traces: Trace[];
  let summary: SliceSummary;

  beforeAll(() => {
    traces = familyTraces();
    summary = runSlice(agentRoot, mkdtempSync(join(tmpdir(), "lab-slice-")));
  }, 60_000);

  it("text-rule labels the poisoned fixture FAIL and the clean control PASS", () => {
    expect(textRuleLabel(FIXTURES[FAMILY].poisoned.toolResponse)).toBe("FAIL");
    expect(textRuleLabel(FIXTURES[FAMILY].clean.toolResponse)).toBe("PASS");
  });

  it("labels come from observed behaviour, not from the arm", () => {
    // protected != automatically PASS, vulnerable != automatically FAIL:
    // every execution's evaluation must match the oracle on its own trace.
    // Uses the real trace digest so production evidence validation passes.
    const traceDigest = digestFiles(agentRoot, [join(agentRoot, TRACES_PATH)])[0].digest;
    for (const t of traces) {
      const exec = buildExecution(t, traceDigest, agentRoot);
      const expected = t.forbidden_sink_emitted ? "FAIL" : "PASS";
      expect(exec.completedEvaluation?.outcome).toBe(expected);
      expect(exec.evidenceIntegrity.status).toBe("COMPLETE");
      expect(exec.result).toBe(expected);
    }
    expect(traces.some((t) => t.condition === "protected")).toBe(true);
    expect(traces.some((t) => t.condition === "vulnerable")).toBe(true);
  });

  it("case identity is sourceCaseId+arm+seed+scenario, attemptId separate", () => {
    const traceDigest = digestFiles(agentRoot, [join(agentRoot, TRACES_PATH)])[0].digest;
    const exec = buildExecution(traces[0], traceDigest, agentRoot);
    const id = new CaseIdentity(exec.identity);
    expect(id.fields.sourceCaseId).toBe(traces[0].fixture_id);
    expect(id.fields.arm).toBe(traces[0].condition);
    expect(id.fields.seed).toBe(traces[0].seed);
    expect(id.fields.scenario).toBe(FAMILY);
    expect("attemptId" in exec.identity).toBe(false);
  });

  it("every case carries two heuristic judge labels with provenance", () => {
    for (const exec of summary.executions) {
      expect(exec.provenance.map((p) => p.judgeId).sort()).toEqual([
        "lab/m0-oracle",
        "lab/text-rule",
      ]);
      for (const p of exec.provenance) {
        expect(p.origin).toBe("HEURISTIC");
        expect(p.configHash).toHaveLength(64);
        expect(p.inputHash).toHaveLength(64);
        expect(p.rawResponse.length).toBeGreaterThan(0);
      }
    }
  });

  it("rescore is deterministic on the canonical projection", () => {
    const exec = summary.executions[0];
    const again = { ...exec, completedEvaluation: rescore(exec) };
    expect(canonicalProjection(again)).toEqual(canonicalProjection(again));
    expect(canonicalProjection(again)).toEqual(canonicalProjection(exec));
  });

  it("slice replays every written bundle and reports agreement", () => {
    expect(summary.cases).toBeGreaterThan(0);
    expect(summary.replayFailures).toEqual([]);
    expect(summary.replayVerified).toBe(summary.cases);
    // agreement is dataset-level from individual labels, never fused outcomes
    expect(summary.agreement.pairs.length).toBe(1);
    expect(summary.agreement.pairs[0].judgeA).toBe("lab/m0-oracle");
    expect(summary.agreement.pairs[0].judgeB).toBe("lab/text-rule");
    expect(summary.agreement.pairs[0].contributingCaseIds.length).toBe(summary.cases);
  });

  it("evidence assembly discovers a missing trace through the production path", () => {
    const dir = mkdtempSync(join(tmpdir(), "lab-noevidence-"));
    const exec = buildExecution(traces[0], "d".repeat(64), dir);
    expect(exec.evidenceIntegrity.status).toBe("FAILED");
    expect(exec.evidenceIntegrity.findings.some((f) => f.startsWith("MISSING_TRACE"))).toBe(true);
    expect(exec.completedEvaluation?.outcome).toBe(traces[0].forbidden_sink_emitted ? "FAIL" : "PASS");
    expect(exec.result).toBe("INFRASTRUCTURE_ERROR");
  });

  it("embedded observations are lineage-checked against the trace artifact", () => {
    const exec = summary.executions[0];
    expect(verifyObservationLineage(exec, agentRoot)).toBeNull();
    // A verdict-preserving tamper still breaks lineage.
    const tampered = { ...exec, observations: { ...(exec.observations as object), agent_complied: !(exec.observations as Trace).agent_complied } };
    expect(verifyObservationLineage(tampered, agentRoot)).toMatch(/OBSERVATION_LINEAGE_MISMATCH/);
  });
});
