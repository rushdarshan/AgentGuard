import { wilsonCI } from "./stats";

export type ConfidenceTier = "trustworthy" | "borderline" | "low-confidence";

export function classifyConfidence(passed: number, total: number, lowerBound?: number): ConfidenceTier {
  if (total === 0 || total < 5) return "low-confidence";

  const ci = wilsonCI(passed, total);
  if (!ci) return "low-confidence";

  if (lowerBound !== undefined) {
    return ci.lower >= lowerBound ? "trustworthy" : "low-confidence";
  }

  if (ci.lower >= 0.9) return "trustworthy";
  if (ci.lower >= 0.5) return "borderline";
  return "low-confidence";
}

export function getConfidenceLabel(tier: ConfidenceTier): string {
  switch (tier) {
    case "trustworthy":
      return "High confidence — consistent defensive behavior across sample.";
    case "borderline":
      return "Moderate confidence — review edge cases for pattern of compromise.";
    case "low-confidence":
      return "Low confidence — insufficient data or inconsistent results. Increase sample size.";
  }
}

export function getConfidenceColor(tier: ConfidenceTier): string {
  switch (tier) {
    case "trustworthy":
      return "#4AF626";
    case "borderline":
      return "#F5A623";
    case "low-confidence":
      return "#E61919";
  }
}

export function getConfidenceBadge(tier: ConfidenceTier): { label: string; color: string } {
  const labels: Record<ConfidenceTier, string> = {
    trustworthy: "Trustworthy",
    borderline: "Borderline",
    "low-confidence": "Low Confidence",
  };
  return { label: labels[tier], color: getConfidenceColor(tier) };
}
