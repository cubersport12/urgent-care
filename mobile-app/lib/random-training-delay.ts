export function selectionStepDelays(count: number, random = Math.random): number[] {
  const weights = Array.from({ length: count }, () => 0.5 + random());
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => Math.ceil(3500 * weight / total));
}
