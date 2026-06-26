export interface WilsonCI {
  point: number;
  lower: number;
  upper: number;
  interval: number;
}

// ponytail: Wilson score interval for binomial proportions. No framework, no deps.
export function wilsonCI(passed: number, total: number, z = 1.96): WilsonCI {
  if (total === 0) return { point: 0, lower: 0, upper: 0, interval: 0 };

  const p = passed / total;
  const z2 = z * z;
  const denominator = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denominator;
  const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total)) / denominator;

  return {
    point: p,
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
    interval: (2 * margin) / 2,
  };
}

export function formatCI(ci: WilsonCI, decimals = 1): string {
  const pct = (v: number) => (v * 100).toFixed(decimals);
  return `${pct(ci.point)}% ± ${(ci.interval * 100).toFixed(decimals)}% [${pct(ci.lower)}–${pct(ci.upper)}]`;
}

export function isSignificant(ciA: WilsonCI, ciB: WilsonCI): boolean {
  return ciA.lower > ciB.upper || ciB.lower > ciA.upper;
}

export function compareRuns(
  runA: { passedTests: number; totalTests: number; label?: string },
  runB: { passedTests: number; totalTests: number; label?: string }
): { a: WilsonCI; b: WilsonCI; significant: boolean } {
  const a = wilsonCI(runA.passedTests, runA.totalTests);
  const b = wilsonCI(runB.passedTests, runB.totalTests);
  return { a, b, significant: isSignificant(a, b) };
}
