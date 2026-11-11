import type { AttemptView } from "@/lib/exam/session";
import type { PublicBody, PublicQuestion } from "@/lib/questions/public";

type Item = AttemptView["items"][number];
type Section = AttemptView["sections"][number];

export function question(id: string, body: PublicBody, extra: Partial<PublicQuestion> = {}): PublicQuestion {
  return { id, type: body.type as PublicQuestion["type"], stemHtml: `<p>Stem ${id}</p>`, exhibits: [], body, maxPoints: 1, ...extra };
}

export const singleBody = (): PublicBody => ({ type: "single", options: [{ id: "a", html: "Alpha" }, { id: "b", html: "Beta" }] });
export const seriesBody = (n = 1): PublicBody => ({ type: "series_yesno", solutionHtml: `<p>Solution ${n}</p>` });

export function item(id: string, order: number, sectionId: string, body: PublicBody = singleBody(), extra: Partial<Item> = {}): Item {
  return { id, order, sectionId, question: question(`q${id}`, body), response: null, flagged: false, answered: false, ...extra };
}

export function section(id: string, order: number, kind: Section["kind"], itemIds: string[], extra: Partial<Section> = {}): Section {
  return { id, order, kind, locked: false, itemIds, ...extra };
}

export const NOW = "2026-01-01T10:00:00.000Z";

export function view(extra: Partial<AttemptView> = {}): AttemptView {
  const items = extra.items ?? [item("i1", 1, "s1"), item("i2", 2, "s1"), item("i3", 3, "s1")];
  const sections = extra.sections ?? [section("s1", 1, "main", items.map((i) => i.id))];
  return {
    id: "att1",
    status: "in_progress",
    locale: "en",
    certification: { code: "az-104", title: "Azure Administrator" },
    durationMin: 100,
    totalQuestions: items.length,
    questionRange: { min: 40, max: 60 },
    sectionKinds: sections.map((s) => s.kind),
    startedAt: NOW,
    deadlineAt: "2026-01-01T11:40:00.000Z",
    serverNow: NOW,
    remainingMs: 100 * 60_000,
    warningsMin: [10, 1],
    currentSectionId: sections[0]?.id ?? null,
    ...extra,
    sections,
    items,
  };
}

/** A fetch Response-like object. */
export function res(status: number, data: unknown = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => data } as Response;
}

/** jsdom has no HTMLDialogElement.showModal/close: minimal polyfill. */
export function polyfillDialog() {
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & { __poly?: boolean };
  if (proto.__poly) return;
  proto.__poly = true;
  proto.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  proto.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}
