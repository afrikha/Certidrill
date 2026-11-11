/**
 * Display order of the shuffleable lists of a question. Frozen per attempt in
 * attempt_item.optionOrder (spec §7) so that a started exam never changes.
 */
import type { QuestionBody, QuestionTypeCode } from "./schema";

export type OptionOrder = Record<string, string[]>;

/** The lists of a question whose order may be shuffled, with their natural order. */
export function shuffleableLists(type: QuestionTypeCode, body: unknown): OptionOrder {
  switch (type) {
    case "single":
    case "multi":
      return { options: (body as QuestionBody<"single">).options.map((o) => o.id) };
    case "dropdown":
      return Object.fromEntries((body as QuestionBody<"dropdown">).slots.map((s) => [`slot:${s.id}`, s.options.map((o) => o.id)]));
    case "dragdrop":
      return { items: (body as QuestionBody<"dragdrop">).items.map((i) => i.id) };
    case "ordering":
      // Always shuffled: the natural order would often give the answer away.
      return { actions: (body as QuestionBody<"ordering">).actions.map((a) => a.id) };
    default:
      return {};
  }
}

/**
 * Builds the frozen order. `random` returns a float in [0, 1). Lists are
 * shuffled unless `shuffle` is false — except ordering actions, always shuffled.
 */
export function buildOptionOrder(type: QuestionTypeCode, body: unknown, shuffle: boolean, random: () => number): OptionOrder {
  const lists = shuffleableLists(type, body);
  const result: OptionOrder = {};
  for (const [key, ids] of Object.entries(lists)) {
    result[key] = shuffle || type === "ordering" ? shuffleArray(ids, random) : ids;
  }
  return result;
}

export function shuffleArray<T>(input: readonly T[], random: () => number): T[] {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

/** Applies a frozen order to a list; unknown/missing ids keep their natural position at the end. */
export function applyOrder<T extends { id: string }>(list: readonly T[], order: string[] | undefined): T[] {
  if (!order) return [...list];
  const byId = new Map(list.map((x) => [x.id, x]));
  const ordered = order.flatMap((id) => {
    const x = byId.get(id);
    if (!x) return [];
    byId.delete(id);
    return [x];
  });
  return [...ordered, ...byId.values()];
}
