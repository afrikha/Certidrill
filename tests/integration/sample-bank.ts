import type { AttemptView } from "@/lib/exam/session";
import type { PrismaClient } from "@prisma/client";

/**
 * Integration tests run on a small, stable bank: the 28 original sample
 * questions (with the Northwind case study and the Auditors series). The real
 * question bank grows over time, so every other question is kept in draft.
 */
const SAMPLE_QUESTION = /^(stor|id|comp|net|mon|series-auditors|cs-nw)-/;

export async function publishSampleBank(db: PrismaClient) {
  await db.question.updateMany({ data: { status: "draft" } });
  await db.caseStudy.updateMany({ data: { status: "draft" } });
  await db.questionSeries.updateMany({ data: { status: "draft" } });
  const ids = (await db.question.findMany({ select: { id: true } })).map((q) => q.id).filter((id) => SAMPLE_QUESTION.test(id));
  await db.question.updateMany({ where: { id: { in: ids } }, data: { status: "published" } });
  await db.caseStudy.updateMany({ where: { id: "cs-northwind-clinics" }, data: { status: "published" } });
  await db.questionSeries.updateMany({ where: { id: "series-auditors-read" }, data: { status: "published" } });
  return ids.length;
}

/** Answers every item of a section with a schema-valid (not necessarily correct) response. */
export function anyResponse(item: AttemptView["items"][number]): unknown {
  const b = item.question.body;
  switch (b.type) {
    case "single":
      return { optionId: b.options[0]!.id };
    case "multi":
      return { optionIds: b.options.slice(0, b.choose).map((o) => o.id) };
    case "yesno_statements":
      return { values: Object.fromEntries(b.statements.map((s) => [s.id, true])) };
    case "dropdown":
      return { values: Object.fromEntries(b.segments.flatMap((s) => (s.kind === "slot" ? [[s.id, s.options[0]!.id]] : []))) };
    case "dragdrop":
      return { mapping: Object.fromEntries(b.targets.map((t) => [t.id, b.items[0]!.id])) };
    case "ordering":
      return { sequence: b.actions.slice(0, b.count).map((a) => a.id) };
    case "hotarea":
      return { values: Object.fromEntries(b.prompts.map((p) => [p.id, b.rows.flat().find((c) => c.area)!.area!])) };
    case "series_yesno":
      return { value: true };
  }
}

