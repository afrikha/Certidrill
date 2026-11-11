/**
 * React keys for a static list whose items have no identifier (table cells,
 * lines of a correction…): the key comes from the content, with a counter for
 * repeated content, rather than from the position in the list.
 */
export function withKeys<T>(items: readonly T[], content: (item: T) => string): { key: string; item: T }[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const base = content(item);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return { key: n === 0 ? base : `${base}#${n}`, item };
  });
}
