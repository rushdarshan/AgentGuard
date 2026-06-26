export const COOKIE_NAME = "agentguard_session";

export const ATTACK_CATEGORIES = [
  "Prompt Injection",
  "Context Overflow",
  "Logic Collapse",
  "Jailbreak",
  "Hallucination",
  "Schema Drift",
  "Multi-tenant Context Leak",
  "Indirect Prompt Injection",
  "Multi-turn Crescendo",
] as const;

export type AttackCategory = (typeof ATTACK_CATEGORIES)[number];

export function getLoginUrl(): string {
  return "/dashboard";
}

export const RELIABILITY_THRESHOLDS = {
  healthy: 80,
  caution: 60,
  warning: 40,
} as const;
