/**
 * Orders strings by UTF-16 code unit, like Array.prototype.sort() without a
 * comparator, but explicit. Used for file paths: unlike localeCompare, the
 * order does not depend on the machine's locale, so builds are reproducible.
 */
export function compareCodeUnits(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
