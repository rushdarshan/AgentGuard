// Bundle-level drift protection: the committed slice bundles, agreement
// record, and fixtures must match a fresh regeneration up to documented
// volatile fields (wall-clock timestamps). Any other divergence — verdicts,
// labels, versions, agreement, fixtures — fails. Missing required artifacts
// fail; nothing here skips.
import { existsSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EXPERIMENT_ID,
  FAULT_DEMO_EXPERIMENT_ID,
  MODEL_VERDICTS_FILE,
  readFixtures,
  runSlice,
  TRACES_PATH,
} from "./experiments/destructive-command-relay.js";
import { AGREEMENT_RECORD_FILE, readAgreementRecord } from "./agreement.js";
import { canonicalStringify, listExperimentBundles, stableBundleDigest } from "./bundle.js";
import { CaseIdentity } from "./identity.js";

const agentRoot = process.cwd();
const resultsRoot = join(agentRoot, "results", "lab");
const expDir = join(resultsRoot, EXPERIMENT_ID);

function requireCommitted(): void {
  for (const f of ["REPORT.md", `${EXPERIMENT_ID}/${AGREEMENT_RECORD_FILE}`, `${EXPERIMENT_ID}/${MODEL_VERDICTS_FILE}`]) {
    if (!existsSync(join(resultsRoot, f))) throw new Error(`MISSING_COMMITTED_ARTIFACT: results/lab/${f} absent`);
  }
  if (!existsSync(join(agentRoot, TRACES_PATH))) throw new Error(`MISSING_M0_TRACES: ${TRACES_PATH} absent`);
  const cases = readdirSync(expDir).filter((f) => f.endsWith(".json") && f !== AGREEMENT_RECORD_FILE && f !== MODEL_VERDICTS_FILE);
  if (cases.length === 0) throw new Error("MISSING_COMMITTED_ARTIFACT: no committed case bundles");
}

describe("results/lab bundle drift", () => {
  it("fresh regeneration matches committed bundles, agreement, and fixtures", () => {
    requireCommitted();
    const tmp = mkdtempSync(join(tmpdir(), "lab-bundle-drift-"));
    runSlice(agentRoot, tmp);
    const committed = listExperimentBundles(resultsRoot, EXPERIMENT_ID);
    const fresh = listExperimentBundles(tmp, EXPERIMENT_ID);
    const digestByKey = (execs: typeof committed) =>
      new Map(execs.map((e) => [new CaseIdentity(e.identity).key, stableBundleDigest(e)]));
    const committedDigests = digestByKey(committed);
    const freshDigests = digestByKey(fresh);
    // Same case set, same stable digest per case (timestamps excluded; every
    // other field — verdicts, labels, versions, agreement refs — must match).
    expect([...freshDigests.keys()].sort()).toEqual([...committedDigests.keys()].sort());
    for (const [key, digest] of freshDigests) {
      expect(committedDigests.get(key), `stable digest drift for ${key}`).toBe(digest);
    }
    // Agreement record and fixtures match canonically (both byte-stable files).
    expect(canonicalStringify(readAgreementRecord(tmp, EXPERIMENT_ID))).toBe(
      canonicalStringify(readAgreementRecord(resultsRoot, EXPERIMENT_ID)),
    );
    expect(canonicalStringify(readFixtures(tmp))).toBe(canonicalStringify(readFixtures(resultsRoot)));
  }, 120_000);

  it("fault-demonstration bundles are committed and re-verify", () => {
    requireCommitted();
    const demoDir = join(resultsRoot, FAULT_DEMO_EXPERIMENT_ID);
    if (!existsSync(demoDir)) throw new Error(`MISSING_COMMITTED_ARTIFACT: ${FAULT_DEMO_EXPERIMENT_ID}/ absent`);
    const demos = readdirSync(demoDir).filter((f) => f.endsWith(".json"));
    expect(demos).toHaveLength(5);
    for (const f of demos) {
      const record = JSON.parse(readFileSync(join(demoDir, f), "utf8"));
      expect(record.faultDemonstration).toBeTruthy();
      expect(record.experimentId).toBe(FAULT_DEMO_EXPERIMENT_ID);
    }
  });
});
