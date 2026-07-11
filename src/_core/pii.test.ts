import { expect, test, describe } from "vitest";
import { scanPII, formatPIISummary, redactPII } from "./pii";

describe("pii.ts — scanPII", () => {
  test("detects email", async () => {
    const spans = await scanPII("send to user@example.com");
    expect(spans.some(s => s.label === "EMAIL")).toBe(true);
  });

  test("detects SSN", async () => {
    const spans = await scanPII("SSN is 123-45-6789");
    expect(spans.some(s => s.label === "SSN")).toBe(true);
  });

  test("detects phone number", async () => {
    const spans = await scanPII("call (555) 123-4567");
    expect(spans.some(s => s.label === "PHONE")).toBe(true);
  });

  test("detects credit card (Luhn-valid)", async () => {
    // Visa test number: 4111 1111 1111 1111
    const spans = await scanPII("card: 4111111111111111");
    expect(spans.some(s => s.label === "CREDIT_CARD")).toBe(true);
  });

  test("rejects invalid credit card (Luhn fail)", async () => {
    const spans = await scanPII("card: 1234567890123456");
    expect(spans.some(s => s.label === "CREDIT_CARD")).toBe(false);
  });

  test("detects OpenAI-style API key", async () => {
    const spans = await scanPII("value: sk-abcdefghijklmnopqrstuvwx");
    expect(spans.some(s => s.label === "API_KEY")).toBe(true);
  });

  test("detects Bearer token", async () => {
    const spans = await scanPII("Authorization: Bearer abcdefghijklmnopqrstuvwx");
    expect(spans.some(s => s.label === "AUTH_TOKEN")).toBe(true);
  });

  test("detects password= credential", async () => {
    const spans = await scanPII('password=SuperSecret123');
    expect(spans.some(s => s.label === "CREDENTIAL")).toBe(true);
  });

  test("detects internal user_id", async () => {
    const spans = await scanPII('user_id: abcdefghijklmnop');
    expect(spans.some(s => s.label === "INTERNAL_ID")).toBe(true);
  });

  test("detects private IP address", async () => {
    const spans = await scanPII("host is 10.0.0.1");
    expect(spans.some(s => s.label === "IP_ADDRESS")).toBe(true);
  });

  test("returns empty for clean text", async () => {
    const spans = await scanPII("the quick brown fox jumps over the lazy dog");
    expect(spans.length).toBe(0);
  });

  test("detects multiple PII types", async () => {
    const spans = await scanPII("email user@test.com and SSN 999-88-7777");
    const labels = spans.map(s => s.label);
    expect(labels).toContain("EMAIL");
    expect(labels).toContain("SSN");
  });

  test("spans are sorted by position", async () => {
    const spans = await scanPII("SSN 111-22-3333 and email x@y.com");
    for (let i = 1; i < spans.length; i++) {
      expect(spans[i].start).toBeGreaterThanOrEqual(spans[i - 1].start);
    }
  });

  test("redactPII replaces spans", () => {
    const spans = [{ label: "EMAIL" as const, value: "x@y.com", start: 8, end: 15, score: 0.95 }];
    const result = redactPII("send to x@y.com", spans);
    expect(result).toBe("send to [EMAIL REDACTED]");
  });

  test("formatPIISummary counts labels", () => {
    const spans = [
      { label: "EMAIL" as const, value: "a@b.com", start: 0, end: 7, score: 0.95 },
      { label: "EMAIL" as const, value: "c@d.com", start: 8, end: 15, score: 0.95 },
      { label: "SSN" as const, value: "111-22-3333", start: 16, end: 27, score: 0.95 },
    ];
    expect(formatPIISummary(spans)).toBe("EMAIL: 2, SSN: 1");
  });

  test("formatPIISummary empty", () => {
    expect(formatPIISummary([])).toBe("No PII detected");
  });
});
