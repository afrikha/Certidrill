/**
 * React keys for a static list whose items have no identifier (table cells,
 * lines of a correction…): the key comes from the content, with a counter for
 * repeated content, rather than from the position in the list.
 */
export function withKeys<T>(items: readonly T[], content: (item: T) => string): { key: string; item: T }[] {
  const used = new Set<string>();
  const repeats = new Map<string, number>();
  return items.map((item) => {
    const base = content(item);
    let key = base;
    // A suffixed key can equal another item's content ("a", "a", "a#1"):
    // keep counting until the key is free.
    for (let n = repeats.get(base) ?? 0; used.has(key); n++) {
      key = `${base}#${n + 1}`;
      repeats.set(base, n + 1);
    }
    used.add(key);
    return { key, item };
  });
}
