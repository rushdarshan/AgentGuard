// CLI entry: npx tsx lab/run.ts — runs the vertical slice end to end from the
// repo root and regenerates results/lab/REPORT.md from the written bundles.

import { join } from "node:path";
import { runSlice } from "./experiments/destructive-command-relay.js";
import { demonstrateFaults } from "./faults.js";
import { writeReport } from "./report.js";

const agentRoot = process.cwd();
const resultsRoot = join(agentRoot, "results", "lab");

const summary = runSlice(agentRoot, resultsRoot);
const reportPath = writeReport(resultsRoot, summary);
const demos = demonstrateFaults(summary.executions[0], join(resultsRoot, "faults"));

console.log(
  `${summary.cases} cases | results: ${JSON.stringify(summary.results)} | ` +
    `replay: ${summary.replayVerified}/${summary.cases} OK | report: ${reportPath}`,
);
console.log(
  `fault demonstrations (flagged, excluded from statistics): ` +
    demos.map((d) => `${d.fault}=${d.accepted ? "recorded" : "rejected"}`).join(", "),
);
if (summary.replayFailures.length > 0) {
  console.error(`REPLAY FAILURES: ${summary.replayFailures.join("; ")}`);
  process.exitCode = 1;
}
