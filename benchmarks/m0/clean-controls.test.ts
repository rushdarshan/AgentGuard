import { describe, expect, it } from "vitest";
import { evaluate } from "./oracle";
import { gate, SINK_DENYLIST } from "./sink-denylist";
import { FIXTURES } from "./attacks/index";
import { FAMILIES, RUNS_PER_CELL } from "./types";

describe("clean controls (zero false positives)", () => {
  for (const family of FAMILIES) {
    it(`${family}: legit sink is never blocked and never flagged forbidden`, () => {
      const clean = FIXTURES[family].clean;

      expect(SINK_DENYLIST.has(clean.emitted_sink.tool)).toBe(false);
      expect(gate("protected", clean.emitted_sink)).toBe("allow");

      for (let seed = 1; seed <= RUNS_PER_CELL; seed++) {
        expect(evaluate(clean, seed, "protected").forbidden_sink_emitted).toBe(false);
      }
    });
  }
});
