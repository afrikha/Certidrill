/**
 * Client-safe projection of a question: one locale, rendered (sanitized) HTML,
 * options in their frozen display order, and NO answer or explanation.
 */
import type { QuestionTypeCode } from "@/lib/content/schema";

export interface PublicChoice {
  id: string;
  html: string;
}

export type DropdownSegment =
  | { kind: "text"; text: string } // layout "code": raw text, rendered as-is
  | { kind: "html"; html: string } // layout "text": inline HTML
  | { kind: "slot"; id: string; options: PublicChoice[] };

export type PublicBody =
  | { type: "single"; options: PublicChoice[] }
  | { type: "multi"; options: PublicChoice[]; choose: number }
  | { type: "yesno_statements"; statements: PublicChoice[] }
  | { type: "dropdown"; layout: "code" | "text"; language?: string; segments: DropdownSegment[] }
  | { type: "dragdrop"; items: PublicChoice[]; targets: PublicChoice[]; reuse: boolean }
  | { type: "ordering"; actions: PublicChoice[]; count: number }
  | {
      type: "hotarea";
      prompts: PublicChoice[];
      caption?: string;
      header?: string[];
      rows: { html?: string; area?: string }[][];
    }
  | { type: "series_yesno"; solutionHtml: string };

export interface PublicExhibit {
  id: string;
  titleHtml: string;
  html: string;
}

export interface PublicQuestion {
  id: string;
  type: QuestionTypeCode;
  stemHtml: string;
  exhibits: PublicExhibit[];
  body: PublicBody;
  maxPoints: number;
}

/** Candidate response (mirrors the Zod response schemas of lib/questions/schema.ts). */
export type AnyResponse =
  | { optionId: string }
  | { optionIds: string[] }
  | { values: Record<string, boolean> }
  | { values: Record<string, string> }
  | { mapping: Record<string, string> }
  | { sequence: string[] }
  | { value: boolean };

/** Whether a response is complete (used for the "incomplete" state of the review grid). */
export function isComplete(body: PublicBody, response: unknown): boolean {
  if (!response || typeof response !== "object") return false;
  const r = response as Record<string, unknown>;
  switch (body.type) {
    case "single":
      return typeof r.optionId === "string";
    case "multi":
      return Array.isArray(r.optionIds) && r.optionIds.length === body.choose;
    case "yesno_statements":
      return body.statements.every((s) => typeof (r.values as Record<string, unknown> | undefined)?.[s.id] === "boolean");
    case "dropdown":
      return body.segments.every((s) => s.kind !== "slot" || typeof (r.values as Record<string, unknown> | undefined)?.[s.id] === "string");
    case "dragdrop":
      return body.targets.every((t) => typeof (r.mapping as Record<string, unknown> | undefined)?.[t.id] === "string");
    case "ordering":
      return Array.isArray(r.sequence) && r.sequence.length === body.count;
    case "hotarea":
      return body.prompts.every((p) => typeof (r.values as Record<string, unknown> | undefined)?.[p.id] === "string");
    case "series_yesno":
      return typeof r.value === "boolean";
  }
}

/** Whether any part of the response has been given. */
export function isAnswered(response: unknown): boolean {
  if (!response || typeof response !== "object") return false;
  return Object.values(response as Record<string, unknown>).some(isGiven);
}

function isGiven(v: unknown): boolean {
  if (Array.isArray(v)) return v.length > 0;
  if (v && typeof v === "object") return Object.keys(v).length > 0;
  return v !== undefined && v !== null;
}
