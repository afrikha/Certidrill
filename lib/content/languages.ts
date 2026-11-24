/**
 * The content languages of a certification (docs/SPECS-AWS.md §3.7):
 * blueprint certification.languages lists the languages of the official
 * exam. English is always there; French is required wherever the
 * certification offers it, and ignored (not served) where it does not.
 */
import type { ContentText, Localized, Locale } from "@/lib/i18n/config";

/** Whether the certification's content is offered in that locale. */
export function offersLocale(languages: readonly Locale[], locale: Locale): boolean {
  return languages.includes(locale);
}

/**
 * A text of a content file: an object with an `en` string and no key but
 * `en` and `fr` (localizedSchema). Answers hold no text (a dropdown slot may
 * be named "en"), so they are never walked.
 */
function isText(o: Record<string, unknown>): boolean {
  return typeof o.en === "string" && Object.keys(o).every((k) => k === "en" || k === "fr");
}
const NO_TEXT = new Set(["answer"]);

/**
 * The paths (a.b.0.c) of the texts that have English but no French, in any
 * file (blueprint, objectives, question, course manifest).
 */
export function missingFrench(node: unknown, at: (string | number)[] = []): string[] {
  if (Array.isArray(node)) return node.flatMap((v, i) => missingFrench(v, [...at, i]));
  if (!node || typeof node !== "object") return [];
  const o = node as Record<string, unknown>;
  if (isText(o)) return typeof o.fr === "string" && o.fr.length > 0 ? [] : [at.join(".") || "(root)"];
  // An objective: { code, en, fr, learnUrl }.
  if (typeof o.en === "string" && typeof o.code === "string") return typeof o.fr === "string" && o.fr.length > 0 ? [] : [at.join(".") || "(root)"];
  return Object.entries(o).flatMap(([k, v]) => (NO_TEXT.has(k) ? [] : missingFrench(v, [...at, k])));
}

/** The problems "fr is missing", when the certification offers French; none otherwise. */
export function frenchProblems(raw: unknown, languages: readonly Locale[]): string[] {
  if (!languages.includes("fr")) return [];
  return missingFrench(raw).map((p) => `${p}: fr is required (certification.languages includes fr)`);
}

/** A text as served: its French when the certification offers French, its English otherwise. */
export function served(text: ContentText, languages: readonly Locale[]): Localized {
  return { en: text.en, fr: languages.includes("fr") && text.fr ? text.fr : text.en };
}

/**
 * A file's value as served: unchanged when the certification offers French;
 * otherwise every text gets its English as French, so that a French file
 * kept for later is never shown and every reader can keep reading `fr`.
 */
export function servedDeep<T>(node: T, languages: readonly Locale[]): T {
  if (languages.includes("fr")) return node;
  return fillFrench(node) as T;
}

function fillFrench(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(fillFrench);
  if (!node || typeof node !== "object" || node instanceof Date) return node;
  const o = node as Record<string, unknown>;
  if (isText(o) || (typeof o.en === "string" && typeof o.code === "string")) return { ...o, fr: o.en };
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, NO_TEXT.has(k) ? v : fillFrench(v)]));
}
