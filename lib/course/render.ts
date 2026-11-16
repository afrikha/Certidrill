import "server-only";
import { CALLOUTS } from "@/lib/content/course";
import type { Locale } from "@/lib/i18n/config";
import { renderCourseMarkdown } from "@/lib/markdown";

/**
 * Course HTML, cached by (part, language, content version): a section or a
 * summary is rendered once per version and language, then served from memory
 * (docs/SPECS-COURS.md §6, §10: a chapter page in less than 300 ms). A new
 * seed that changes a section changes its contentHash, hence its key; old
 * entries leave by age. Certidrill runs as a single Node process (spec §9).
 */
const MAX_ENTRIES = 2_000;
const cache = new Map<string, Promise<string>>();

/** Labels the HTML carries, in the reader's language. */
export interface CourseLabels {
  table: string;
  copy: string;
}

/** The HTML of a part of a chapter, from the cache when that version was rendered already. */
export function courseHtml(part: { key: string; contentHash: string; markdown: string }, locale: Locale, labels: CourseLabels): Promise<string> {
  const key = `${part.key}:${locale}:${part.contentHash}`;
  const hit = cache.get(key);
  if (hit) {
    // Most recently used last: the oldest entries leave first.
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const callouts = Object.fromEntries(Object.entries(CALLOUTS).map(([kind, label]) => [label[locale], kind]));
  const html = renderCourseMarkdown(part.markdown, { locale, callouts, labels });
  // A failed rendering is not kept: the next request tries again.
  html.catch(() => cache.delete(key));
  cache.set(key, html);
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  return html;
}
