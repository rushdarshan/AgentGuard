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

export function reliabilityBadge(score: number): string {
  return score >= 80 ? "badge-low" : score >= 60 ? "badge-medium" : score >= 40 ? "badge-high" : "badge-critical";
}

export function reliabilityLabel(score: number): string {
  return score >= 80 ? "Healthy" : score >= 60 ? "Caution" : score >= 40 ? "Warning" : "Critical";
}

export function reliabilityColor(score: number): string {
  return score >= 80 ? "text-[#346538]" : score >= 60 ? "text-[#956400]" : score >= 40 ? "text-[#9F2F2D]" : "text-[#9F2F2D]";
}
