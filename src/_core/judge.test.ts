import { expect, test, describe, vi } from "vitest";
import { MultiModelJudge } from "./judge";
import * as llm from "./llm";

vi.mock("./llm", () => ({
  invokeWithProvider: vi.fn(),
  evaluateHeuristic: vi.fn(() => ({ passed: false, reasoning: "heuristic" })),
}));

describe("judge.ts characterization", () => {
  test("evaluate returns consensus when models agree", async () => {
    vi.mocked(llm.invokeWithProvider).mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ passed: true, reasoning: "ok" }) } }],
    } as any);

    const verdict = await MultiModelJudge.evaluate("prompt", "response", "category", ["openai"]);
    expect(verdict.consensus).toBeDefined();
    expect(verdict.modelVerdicts.length).toBe(1);
  });

  test("evaluate falls back to heuristic if all time out", async () => {
    vi.mocked(llm.invokeWithProvider).mockRejectedValue(new Error("timeout"));

    const verdict = await MultiModelJudge.evaluate("prompt", "response", "category", ["openai"]);
    expect(verdict.consensus).toBe("partial");
    expect(verdict.reasoning).toContain("heuristic fallback");
    expect(verdict.modelVerdicts[verdict.modelVerdicts.length - 1].provider).toBe("heuristic");
  });

  test("evaluate detects swap disagreement", async () => {
    // Both return passed:false. Normal frame: stays false. Swap frame: inverted to true. → disagreement.
    vi.mocked(llm.invokeWithProvider)
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ passed: false, reasoning: "v1" }) } }] } as any)
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ passed: false, reasoning: "v2" }) } }] } as any);

    const verdict = await MultiModelJudge.evaluate("prompt", "response", "category", ["openai"]);
    expect(verdict.modelVerdicts[0].swapDisagreement).toBe(true);
  });

  test("evaluate with multiple providers fuses results", async () => {
    vi.mocked(llm.invokeWithProvider)
      .mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ passed: true, reasoning: "ok" }) } }] } as any);

    const verdict = await MultiModelJudge.evaluate("prompt", "response", "category", ["openai", "openai"]);
    expect(verdict.modelVerdicts.length).toBe(2);
    expect(verdict.consensus).toBe("unanimous");
  });

  test("evaluate handles malformed LLM response", async () => {
    vi.mocked(llm.invokeWithProvider).mockResolvedValue({
      choices: [{ message: { content: "not json" } }],
    } as any);

    const verdict = await MultiModelJudge.evaluate("prompt", "response", "category", ["openai"]);
    expect(verdict.modelVerdicts[0].passed).toBe(false);
    expect(verdict.modelVerdicts[0].reasoning).toContain("Failed to parse");
  });
});
