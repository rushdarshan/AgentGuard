// Regeneration drift guard, mirroring benchmarks/m0/m0-table.test.ts: the
// committed results/lab/REPORT.md must match a byte-for-byte regeneration
// from the committed bundles. Missing required artifacts fail; nothing here
// skips: deleting the report disables nothing, it breaks the gate.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderReportFromCommitted } from "./run.js";

const agentRoot = process.cwd();
const resultsRoot = join(agentRoot, "results", "lab");

describe("results/lab/REPORT.md drift", () => {
  it("regenerates byte-identical from committed bundles", () => {
    for (const f of ["REPORT.md", "exp-destructive-command-relay-v1/agreement.json"]) {
      if (!existsSync(join(resultsRoot, f))) throw new Error(`MISSING_COMMITTED_ARTIFACT: results/lab/${f} absent`);
    }
    expect(renderReportFromCommitted(agentRoot, resultsRoot)).toBe(readFileSync(join(resultsRoot, "REPORT.md"), "utf8"));
  }, 120_000);
});
