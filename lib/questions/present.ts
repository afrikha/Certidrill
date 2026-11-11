import "server-only";
import { renderInline, renderMarkdown } from "@/lib/markdown";
import { pick, type Locale } from "@/lib/i18n/config";
import type { Choice, QuestionBody, QuestionTypeCode, Text } from "./schema";
import { maxPoints } from "./schema";
import { applyOrder, type OptionOrder } from "./order";
import type { DropdownSegment, PublicBody, PublicChoice, PublicQuestion } from "./public";

export function text(t: Text, locale: Locale): string {
  return typeof t === "string" ? t : pick(t, locale);
}

/** Minimal shape needed to present a question (a Prisma `question` row fits). */
export interface PresentableQuestion {
  id: string;
  type: QuestionTypeCode;
  stem: unknown;
  exhibits: unknown;
  body: unknown;
}

async function choices(list: Choice[], locale: Locale, order?: string[]): Promise<PublicChoice[]> {
  return Promise.all(applyOrder(list, order).map(async (c) => ({ id: c.id, html: await renderInline(text(c.text, locale)) })));
}

/**
 * Projects a question for the browser: one locale, sanitized HTML, frozen
 * option order. Never includes the answer or the explanation.
 */
export async function presentQuestion(q: PresentableQuestion, locale: Locale, order: OptionOrder = {}): Promise<PublicQuestion> {
  const stem = q.stem as { en: string; fr: string };
  const exhibits = (q.exhibits as { id: string; title: Text; body: Text }[]) ?? [];
  return {
    id: q.id,
    type: q.type,
    stemHtml: await renderMarkdown(pick(stem, locale)),
    exhibits: await Promise.all(
      exhibits.map(async (e) => ({
        id: e.id,
        titleHtml: await renderInline(text(e.title, locale)),
        html: await renderMarkdown(text(e.body, locale)),
      })),
    ),
    body: await presentBody(q.type, q.body, locale, order),
    maxPoints: maxPoints(q.type, q.body),
  };
}

async function presentBody(type: QuestionTypeCode, raw: unknown, locale: Locale, order: OptionOrder): Promise<PublicBody> {
  switch (type) {
    case "single": {
      const b = raw as QuestionBody<"single">;
      return { type, options: await choices(b.options, locale, order.options) };
    }
    case "multi": {
      const b = raw as QuestionBody<"multi">;
      return { type, options: await choices(b.options, locale, order.options), choose: b.choose };
    }
    case "yesno_statements": {
      const b = raw as QuestionBody<"yesno_statements">;
      return { type, statements: await choices(b.statements, locale) };
    }
    case "dropdown":
      return presentDropdown(raw as QuestionBody<"dropdown">, locale, order);
    case "dragdrop": {
      const b = raw as QuestionBody<"dragdrop">;
      return { type, items: await choices(b.items, locale, order.items), targets: await choices(b.targets, locale), reuse: b.reuse };
    }
    case "ordering": {
      const b = raw as QuestionBody<"ordering">;
      return { type, actions: await choices(b.actions, locale, order.actions), count: b.count };
    }
    case "hotarea": {
      const b = raw as QuestionBody<"hotarea">;
      return {
        type,
        prompts: await choices(b.prompts, locale),
        caption: b.grid.caption ? await renderInline(text(b.grid.caption, locale)) : undefined,
        header: b.grid.header ? await Promise.all(b.grid.header.map((h) => renderInline(text(h, locale)))) : undefined,
        rows: await Promise.all(
          b.grid.rows.map((row) =>
            Promise.all(row.map(async (c) => ({ area: c.area, html: c.text ? await renderInline(text(c.text, locale)) : undefined }))),
          ),
        ),
      };
    }
    case "series_yesno": {
      const b = raw as QuestionBody<"series_yesno">;
      return { type, solutionHtml: await renderMarkdown(text(b.solution, locale)) };
    }
  }
}

/** Splits the template around its [[slot]] markers; segments keep the template order. */
async function presentDropdown(b: QuestionBody<"dropdown">, locale: Locale, order: OptionOrder): Promise<PublicBody> {
  const template = text(b.template, locale);
  const segments: Promise<DropdownSegment>[] = [];
  let last = 0;
  for (const m of template.matchAll(/\[\[([a-zA-Z0-9_-]+)\]\]/g)) {
    const before = template.slice(last, m.index);
    if (before) segments.push(textSegment(b.layout, before));
    const slot = b.slots.find((s) => s.id === m[1]);
    if (slot) segments.push(slotSegment(b.layout, slot, locale, order[`slot:${slot.id}`]));
    last = (m.index ?? 0) + m[0].length;
  }
  const rest = template.slice(last);
  if (rest) segments.push(textSegment(b.layout, rest));
  return { type: "dropdown", layout: b.layout, language: b.language, segments: await Promise.all(segments) };
}

async function slotSegment(layout: "code" | "text", slot: QuestionBody<"dropdown">["slots"][number], locale: Locale, slotOrder: OptionOrder[string] | undefined): Promise<DropdownSegment> {
  const options = applyOrder(slot.options, slotOrder);
  return {
    kind: "slot",
    id: slot.id,
    // Options inside code are shown verbatim; in prose they may use inline Markdown.
    options: layout === "code" ? options.map((o) => ({ id: o.id, html: escapeHtml(text(o.text, locale)) })) : await choices(options, locale),
  };
}

async function textSegment(layout: "code" | "text", value: string): Promise<DropdownSegment> {
  return layout === "code" ? { kind: "text", text: value } : { kind: "html", html: await renderInline(value) };
}

function escapeHtml(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
