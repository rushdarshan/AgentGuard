// Regeneration drift guard, mirroring benchmarks/m0/m0-table.test.ts: the
// committed results/lab/REPORT.md must match a fresh byte-for-byte
// regeneration from the consumed M0 traces. REPORT.md is the stable artifact;
// the bundles beside it embed timestamps and are not byte-reproducible.

import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderReport } from "./report.js";
import { runSlice } from "./experiments/destructive-command-relay.js";

const committed = join(process.cwd(), "results", "lab", "REPORT.md");

const suite = existsSync(committed) ? describe : describe.skip;

suite("results/lab/REPORT.md drift", () => {
  it("regenerates byte-identical", () => {
    const summary = runSlice(process.cwd(), mkdtempSync(join(tmpdir(), "lab-drift-")));
    expect(renderReport(summary)).toBe(readFileSync(committed, "utf8"));
  }, 60_000);
});
