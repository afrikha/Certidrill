/**
 * The course as readers see it (docs/SPECS-COURS.md §6): the outline of a
 * certification, a chapter page and the reading progress. Readers see the
 * published chapters only; administrators see every chapter in review too
 * (preview), never a retired one. Everything is read for one viewer: the
 * visibility rule lives here, in one place, for pages and actions alike.
 */
import type { ContentStatus, PrismaClient } from "@prisma/client";
import { pick, type Locale, type Localized } from "@/lib/i18n/config";
import { breakdownBy } from "@/lib/exam/scoring";

export interface Viewer {
  userId: string;
  isAdmin: boolean;
}

/** Statuses of the chapters a viewer may open. */
export function visibleStatuses(viewer: Pick<Viewer, "isAdmin">): ContentStatus[] {
  return viewer.isAdmin ? ["draft", "needs_review", "reviewed", "published"] : ["published"];
}

export interface OutlineSection {
  id: string;
  code: string;
  title: string;
  read: boolean;
}

export interface OutlineChapter {
  code: string;
  title: string;
  minutes: number;
  status: ContentStatus;
  free: boolean;
  sections: OutlineSection[];
  read: number;
  /** In a domain below the pass mark at the last mock exam. */
  weak: boolean;
}

export interface CourseOutline {
  certification: { code: string; title: string };
  modules: { code: string; title: string; chapters: OutlineChapter[] }[];
  sections: number;
  read: number;
  /** The first section not read yet, in reading order; null once everything is read. */
  resume: { chapter: string; section: string; chapterTitle: string; sectionTitle: string } | null;
  /** Domains below the pass mark at the last mock exam of this certification. */
  weakDomains: string[];
}

const localized = (value: unknown, locale: Locale) => pick(value as Localized, locale);

/**
 * Domains below the pass mark at the user's last finished mock exam of a
 * certification (scores scaled like the score report).
 */
export async function weakDomains(db: PrismaClient, userId: string, certificationId: string): Promise<string[]> {
  const last = await db.attempt.findFirst({
    where: { userId, certificationId, status: { in: ["submitted", "expired"] } },
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    select: {
      blueprint: { select: { maxScore: true, passScore: true } },
      items: { select: { pointsEarned: true, pointsMax: true, question: { select: { objective: { select: { domain: { select: { code: true } } } } } } } },
    },
  });
  if (!last) return [];
  const scores = breakdownBy(
    last.items.map((i) => ({ earned: i.pointsEarned ?? 0, max: i.pointsMax ?? 0, domain: i.question.objective.domain.code })),
    (i) => i.domain,
    last.blueprint.maxScore,
  );
  return scores.filter((d) => d.scaledScore < last.blueprint.passScore).map((d) => d.key);
}

/** Whether a certification has a chapter the viewer may open (the "Course" entry of the menu). */
export async function hasVisibleCourse(db: PrismaClient, viewer: Viewer): Promise<boolean> {
  return (await db.courseChapter.count({ where: { status: { in: visibleStatuses(viewer) }, certification: { active: true } }, take: 1 })) > 0;
}

/** Active certifications with a chapter the viewer may open, by code. */
export async function coursesFor(db: PrismaClient, viewer: Viewer) {
  return db.certification.findMany({
    where: { active: true, courseChapters: { some: { status: { in: visibleStatuses(viewer) } } } },
    orderBy: { code: "asc" },
    select: { code: true, title: true },
  });
}

/** The outline of a certification's course for a viewer; null when it has no chapter the viewer may open. */
export async function getCourseOutline(
  db: PrismaClient,
  { certification: code, viewer, locale }: { certification: string; viewer: Viewer; locale: Locale },
): Promise<CourseOutline | null> {
  const certification = await db.certification.findFirst({ where: { code, active: true }, select: { id: true, code: true, title: true } });
  if (!certification) return null;
  const [modules, weak] = await Promise.all([
    db.courseModule.findMany({
      where: { certificationId: certification.id },
      orderBy: { order: "asc" },
      select: {
        code: true,
        title: true,
        chapters: {
          where: { status: { in: visibleStatuses(viewer) } },
          orderBy: { order: "asc" },
          select: {
            code: true,
            title: true,
            minutes: true,
            status: true,
            free: true,
            sections: {
              orderBy: { order: "asc" },
              select: { id: true, code: true, title: true, progress: { where: { userId: viewer.userId }, select: { readAt: true } } },
            },
          },
        },
      },
    }),
    weakDomains(db, viewer.userId, certification.id),
  ]);
  const outline: CourseOutline = {
    certification: { code: certification.code, title: certification.title },
    modules: modules
      .filter((m) => m.chapters.length > 0)
      .map((m) => ({
        code: m.code,
        title: localized(m.title, locale),
        chapters: m.chapters.map((c) => {
          const sections = c.sections.map((s) => ({ id: s.id, code: s.code, title: localized(s.title, locale), read: s.progress.length > 0 }));
          return { code: c.code, title: localized(c.title, locale), minutes: c.minutes, status: c.status, free: c.free, sections, read: sections.filter((s) => s.read).length, weak: weak.includes(m.code) };
        }),
      })),
    sections: 0,
    read: 0,
    resume: null,
    weakDomains: weak,
  };
  if (outline.modules.length === 0) return null;
  for (const c of outline.modules.flatMap((m) => m.chapters)) {
    outline.sections += c.sections.length;
    outline.read += c.read;
    const next = c.sections.find((s) => !s.read);
    if (next && !outline.resume) outline.resume = { chapter: c.code, section: next.code, chapterTitle: c.title, sectionTitle: next.title };
  }
  return outline;
}

export interface ChapterSection {
  id: string;
  code: string;
  title: string;
  /** Markdown of the section in the reader's language, and what versions its rendering (cache key). */
  body: string;
  contentHash: string;
  objectives: { code: string; title: string }[];
  read: boolean;
}

export interface ChapterPage {
  certification: { code: string; title: string };
  module: { code: string; title: string };
  code: string;
  title: string;
  status: ContentStatus;
  free: boolean;
  minutes: number;
  summary: string;
  /** Version of the chapter's own content (the summary's cache key). */
  contentHash: string;
  references: { title: string; url: string }[];
  sections: ChapterSection[];
  previous: { code: string; title: string } | null;
  next: { code: string; title: string } | null;
}

/** A chapter the viewer may open, with its sections in the reader's language; null otherwise. */
export async function getChapter(
  db: PrismaClient,
  { certification: code, chapter: chapterCode, viewer, locale }: { certification: string; chapter: string; viewer: Viewer; locale: Locale },
): Promise<ChapterPage | null> {
  const certification = await db.certification.findFirst({ where: { code, active: true }, select: { id: true, code: true, title: true } });
  if (!certification) return null;
  const statuses = visibleStatuses(viewer);
  const chapter = await db.courseChapter.findFirst({
    where: { certificationId: certification.id, code: chapterCode, status: { in: statuses } },
    include: {
      module: { select: { code: true, title: true } },
      sections: {
        orderBy: { order: "asc" },
        include: {
          objectives: { orderBy: [{ domain: { order: "asc" } }, { order: "asc" }], select: { code: true, title: true } },
          progress: { where: { userId: viewer.userId }, select: { readAt: true } },
        },
      },
    },
  });
  if (!chapter) return null;
  // Previous and next among the chapters the viewer may open, in reading order.
  const order = await db.courseChapter.findMany({
    where: { certificationId: certification.id, status: { in: statuses } },
    orderBy: { order: "asc" },
    select: { code: true, title: true },
  });
  const at = order.findIndex((c) => c.code === chapter.code);
  const neighbour = (i: number) => (order[i] ? { code: order[i].code, title: localized(order[i].title, locale) } : null);
  return {
    certification: { code: certification.code, title: certification.title },
    module: { code: chapter.module.code, title: localized(chapter.module.title, locale) },
    code: chapter.code,
    title: localized(chapter.title, locale),
    status: chapter.status,
    free: chapter.free,
    minutes: chapter.minutes,
    summary: localized(chapter.summary, locale),
    contentHash: chapter.contentHash,
    references: chapter.references as { title: string; url: string }[],
    sections: chapter.sections.map((s) => ({
      id: s.id,
      code: s.code,
      title: localized(s.title, locale),
      body: localized(s.body, locale),
      contentHash: s.contentHash,
      objectives: s.objectives.map((o) => ({ code: o.code, title: localized(o.title, locale) })),
      read: s.progress.length > 0,
    })),
    previous: neighbour(at - 1),
    next: neighbour(at + 1),
  };
}

export class CourseError extends Error {
  constructor(readonly code: "not_found") {
    super(code);
    this.name = "CourseError";
  }
}

/**
 * Marks a section read, or not read any more. The section must belong to a
 * chapter the viewer may open (CourseError "not_found" otherwise, the same
 * answer as for a section that does not exist). Returns where the section is,
 * for the page to refresh.
 */
export async function setSectionRead(db: PrismaClient, { viewer, sectionId, read }: { viewer: Viewer; sectionId: string; read: boolean }) {
  const section = await db.courseSection.findFirst({
    where: { id: sectionId, chapter: { status: { in: visibleStatuses(viewer) }, certification: { active: true } } },
    select: { id: true, code: true, chapter: { select: { code: true, certification: { select: { code: true } } } } },
  });
  if (!section) throw new CourseError("not_found");
  const key = { userId_sectionId: { userId: viewer.userId, sectionId } };
  if (read) await db.courseProgress.upsert({ where: key, create: { userId: viewer.userId, sectionId }, update: {} });
  else await db.courseProgress.deleteMany({ where: { userId: viewer.userId, sectionId } });
  return { certification: section.chapter.certification.code, chapter: section.chapter.code, section: section.code };
}
