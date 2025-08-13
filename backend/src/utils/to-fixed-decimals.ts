export function toFixedDecimals(value: number, decimals = 2): number {
  const roundingFactor = Math.pow(10, decimals);
  const roundedValue = Math.round(value * roundingFactor) / roundingFactor;
  return roundedValue;
}
