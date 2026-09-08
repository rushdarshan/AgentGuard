import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readTraces } from "./runner";
import { renderTable } from "./report";

const tracesPath = fileURLToPath(new URL("../../results/m0/traces.jsonl", import.meta.url));
const tablePath = fileURLToPath(new URL("../../results/m0/table.md", import.meta.url));

describe("M0 table (CI drift check)", () => {
  it("rendered table matches the committed table.md", () => {
    if (!existsSync(tracesPath)) {
      throw new Error(`missing ${tracesPath}; run \`npm run bench:m0\` first`);
    }
    const rendered = renderTable(readTraces(tracesPath));
    const committed = readFileSync(tablePath, "utf8");

    expect(rendered).toBe(committed);
  });
});
