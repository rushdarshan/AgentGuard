export type PIILabel = "EMAIL" | "PHONE" | "SSN" | "CREDIT_CARD" | "API_KEY" | "INTERNAL_ID" | "IP_ADDRESS" | "AUTH_TOKEN" | "CREDENTIAL";

export interface PIISpan {
  label: PIILabel;
  value: string;
  start: number;
  end: number;
  score: number;
}

interface PIIPattern {
  label: PIILabel;
  regex: RegExp;
  validate?: (match: string) => boolean;
}

const patterns: PIIPattern[] = [
  {
    label: "EMAIL",
    regex: /[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}/g,
  },
  {
    label: "PHONE",
    regex: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  },
  {
    label: "SSN",
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
  },
  {
    label: "CREDIT_CARD",
    regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    validate: (match: string) => {
      const digits = match.replace(/[-\s]/g, "");
      if (digits.length !== 16) return false;
      let sum = 0;
      for (let i = 0; i < digits.length; i++) {
        let d = parseInt(digits[i]);
        if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; }
        sum += d;
      }
      return sum % 10 === 0;
    },
  },
  {
    label: "API_KEY",
    regex: /\b(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36,}|gho_[a-zA-Z0-9]{36,}|ghu_[a-zA-Z0-9]{36,}|ghb_[a-zA-Z0-9]{36,}|xox[bpras]-[a-zA-Z0-9-]{10,}|[A-Za-z0-9_-]{20,})\b/g,
  },
  {
    label: "AUTH_TOKEN",
    regex: /\b(?:Bearer|Token|Basic)\s+[A-Za-z0-9._-]{8,}/gi,
  },
  {
    label: "CREDENTIAL",
    regex: /(?:password|passwd|secret|api[_-]?key|auth[_-]?token|access[_-]?key)[=:]["']?([A-Za-z0-9._-]{8,})["']?/gi,
  },
  {
    label: "INTERNAL_ID",
    regex: /\b(?:user[_-]?id|account[_-]?id|customer[_-]?id|employee[_-]?id|session[_-]?id|transaction[_-]?id)\s*[:=]\s*['"]?(\d+|\w{8,})['"]?/gi,
  },
  {
    label: "IP_ADDRESS",
    regex: /\b(?:(?:10|127|172\.(?:1[6-9]|2[0-9]|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g,
  },
];

const entropyCache = new Set<string>();

// ponytail: Privacy Filter (OpenAI opf) optional backend — guarded for browser builds
let _opfAvailable: boolean | null = null;
async function scanPIIWithOPF(text: string): Promise<PIISpan[] | null> {
  if (typeof process === "undefined" || typeof process.env === "undefined") return null;
  if (!process.env.PII_BACKEND || process.env.PII_BACKEND !== "openai") return null;
  if (_opfAvailable === null) {
    try {
      const { execSync } = await import("child_process");
      execSync("which opf 2>/dev/null || where opf 2>nul", { encoding: "utf8", stdio: "pipe" });
      _opfAvailable = true;
    } catch (err) { console.warn(err);  _opfAvailable = false; }
  }
  if (!_opfAvailable) return null;
  try {
    const { execSync } = await import("child_process");
    const result = execSync(`opf ${JSON.stringify(text)} --json 2>/dev/null`, { encoding: "utf8", timeout: 30000, maxBuffer: 10 * 1024 * 1024 });
    const parsed = JSON.parse(result);
    return (parsed.spans ?? parsed).map((s: any) => ({
      label: OPF_LABEL_MAP[s.label?.toLowerCase()] ?? "CREDENTIAL",
      value: s.value ?? s.text ?? "",
      start: s.start ?? 0,
      end: s.end ?? 0,
      score: s.score ?? 0.95,
    }));
  } catch (err) { console.warn(err);  return null; }
}

const OPF_LABEL_MAP: Record<string, PIILabel> = {
  private_email: "EMAIL",
  private_phone: "PHONE",
  secret: "API_KEY",
  private_date: "INTERNAL_ID",
  account_number: "INTERNAL_ID",
  private_address: "INTERNAL_ID",
};

function shannonEntropy(s: string): number {
  const len = s.length;
  if (len === 0) return 0;
  const freq = new Map<string, number>();
  for (const ch of s) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let h = 0;
  for (const c of freq.values()) {
    const p = c / len;
    h -= p * Math.log2(p);
  }
  return h;
}

const SUSPICIOUS_CONTEXT = /\b(key|secret|password|passwd|token|auth|credential|api[_-]?key|access[_-]?key|private|bearer)\b/i;

export async function scanPII(text: string): Promise<PIISpan[]> {
  // ponytail: try OpenAI Privacy Filter backend first if opted in
  const opfSpans = await scanPIIWithOPF(text);
  if (opfSpans) return opfSpans;

  const spans: PIISpan[] = [];

  // ponytail: single-pass entropy scan for unknown high-entropy secrets
  const tokens = text.split(/[\s,;|"'=:]+/);
  for (const token of tokens) {
    if (token.length < 8 || token.length > 128) continue;
    if (/^\d+$/.test(token)) continue;
    if (entropyCache.has(token)) continue;
    const h = shannonEntropy(token);
    if (h > 3.6 && SUSPICIOUS_CONTEXT.test(text)) {
      const idx = text.indexOf(token);
      if (idx >= 0) {
        spans.push({ label: "CREDENTIAL", value: token, start: idx, end: idx + token.length, score: Math.min(0.5 + (h - 3.6) / 3, 0.99) });
        entropyCache.add(token);
      }
    }
  }

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern.regex);
    for (const match of matches) {
      if (match.index === undefined) continue;
      const value = match[0];
      // ponytail: simple length-based dedup, overlaps keep the longer span
      const isDup = spans.some(s =>
        s.start <= match.index! && s.end >= match.index! + value.length
      );
      if (isDup) continue;

      if (pattern.validate && !pattern.validate(value)) continue;

      spans.push({
        label: pattern.label,
        value,
        start: match.index,
        end: match.index + value.length,
        score: pattern.label === "EMAIL" || pattern.label === "SSN" ? 0.95 : 0.85,
      });
    }
  }

  // ponytail: sort by position for display
  spans.sort((a, b) => a.start - b.start);
  return spans;
}

export function formatPIISummary(spans: PIISpan[]): string {
  if (spans.length === 0) return "No PII detected";
  const byLabel: Record<string, number> = {};
  for (const s of spans) {
    byLabel[s.label] = (byLabel[s.label] || 0) + 1;
  }
  return Object.entries(byLabel)
    .map(([label, count]) => `${label}: ${count}`)
    .join(", ");
}

const redactMap: Record<PIILabel, string> = {
  EMAIL: "[EMAIL REDACTED]",
  PHONE: "[PHONE REDACTED]",
  SSN: "[SSN REDACTED]",
  CREDIT_CARD: "[CC REDACTED]",
  API_KEY: "[API KEY REDACTED]",
  AUTH_TOKEN: "[TOKEN REDACTED]",
  CREDENTIAL: "[CREDENTIAL REDACTED]",
  INTERNAL_ID: "[ID REDACTED]",
  IP_ADDRESS: "[IP REDACTED]",
};

export function redactPII(text: string, spans: PIISpan[]): string {
  const parts: string[] = [];
  let lastEnd = 0;

  for (const span of spans) {
    parts.push(text.slice(lastEnd, span.start));
    parts.push(redactMap[span.label] || "[REDACTED]");
    lastEnd = span.end;
  }
  parts.push(text.slice(lastEnd));

  return parts.join("");
}
