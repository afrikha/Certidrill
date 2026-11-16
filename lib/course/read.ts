/**
 * The course as readers see it (docs/SPECS-COURS.md §6): the outline of a
 * certification, a chapter page and the reading progress. Readers see the
 * published chapters only; administrators see every chapter in review too
 * (preview), never a retired one. Everything is read for one viewer: the
 * visibility rule lives here, in one place, for pages and actions alike.
 *
 * Access (§8): a chapter marked `free` is open to every reader; the others
 * need full access to the certification (getAccess). A locked chapter shows
 * its titles only: its summary, sections and references are not even read
 * from the database, so they cannot reach the browser.
 */
import type { ContentStatus, PrismaClient } from "@prisma/client";
import { pick, type Locale, type Localized } from "@/lib/i18n/config";
import { breakdownBy } from "@/lib/exam/scoring";
import { getAccess, type AccessLevel } from "@/lib/access";

export interface Viewer {
  userId: string;
  isAdmin: boolean;
}

/** The access level of a viewer to a certification: full for administrators, else as getAccess says. */
export async function courseLevel(db: PrismaClient, viewer: Viewer, certificationId: string): Promise<AccessLevel> {
  if (viewer.isAdmin) return "full";
  return (await getAccess(db, viewer.userId, certificationId)).level;
}

/** A chapter that only its titles show at this access level. */
export const isLocked = (chapter: { free: boolean }, level: AccessLevel) => !chapter.free && level !== "full";

/** Where a locked chapter leads: the offer screen, with why. */
export const offerUrl = (certification: string) => `/offer?${new URLSearchParams({ reason: "course", certification })}`;

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
  /** Titles only at the viewer's access level. */
  locked: boolean;
}

export interface CourseOutline {
  certification: { code: string; title: string };
  level: AccessLevel;
  modules: { code: string; title: string; chapters: OutlineChapter[] }[];
  sections: number;
  read: number;
  /** The first section not read yet of the chapters the viewer may read, in reading order; null once they are all read. */
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
  const [modules, weak, level] = await Promise.all([
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
    courseLevel(db, viewer, certification.id),
  ]);
  const outline: CourseOutline = {
    certification: { code: certification.code, title: certification.title },
    level,
    modules: modules
      .filter((m) => m.chapters.length > 0)
      .map((m) => ({
        code: m.code,
        title: localized(m.title, locale),
        chapters: m.chapters.map((c) => {
          const sections = c.sections.map((s) => ({ id: s.id, code: s.code, title: localized(s.title, locale), read: s.progress.length > 0 }));
          const chapter = { code: c.code, title: localized(c.title, locale), minutes: c.minutes, status: c.status, free: c.free, sections, read: sections.filter((s) => s.read).length };
          return { ...chapter, weak: weak.includes(m.code), locked: isLocked(c, level) };
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
    const next = c.locked ? undefined : c.sections.find((s) => !s.read);
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
  /** Titles only: summary, bodies and references are empty, the offer screen is the way on. */
  locked: boolean;
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
  const where = { certificationId: certification.id, code: chapterCode, status: { in: statuses } };
  const [found, level] = await Promise.all([db.courseChapter.findFirst({ where, select: { free: true } }), courseLevel(db, viewer, certification.id)]);
  if (!found) return null;
  // What the reader is not entitled to is not read at all.
  const locked = isLocked(found, level);
  const chapter = await db.courseChapter.findFirst({
    where,
    select: {
      code: true,
      title: true,
      status: true,
      free: true,
      minutes: true,
      contentHash: true,
      summary: !locked,
      references: !locked,
      module: { select: { code: true, title: true } },
      sections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          code: true,
          title: true,
          contentHash: true,
          body: !locked,
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
    locked,
    module: { code: chapter.module.code, title: localized(chapter.module.title, locale) },
    code: chapter.code,
    title: localized(chapter.title, locale),
    status: chapter.status,
    free: chapter.free,
    minutes: chapter.minutes,
    summary: chapter.summary ? localized(chapter.summary, locale) : "",
    contentHash: chapter.contentHash,
    references: (chapter.references ?? []) as { title: string; url: string }[],
    sections: chapter.sections.map((s) => ({
      id: s.id,
      code: s.code,
      title: localized(s.title, locale),
      body: s.body ? localized(s.body, locale) : "",
      contentHash: s.contentHash,
      objectives: s.objectives.map((o) => ({ code: o.code, title: localized(o.title, locale) })),
      read: s.progress.length > 0,
    })),
    previous: neighbour(at - 1),
    next: neighbour(at + 1),
  };
}

export class CourseError extends Error {
  constructor(readonly code: "not_found" | "locked") {
    super(code);
    this.name = "CourseError";
  }
}

/**
 * Marks a section read, or not read any more. The section must belong to a
 * chapter the viewer may open (CourseError "not_found" otherwise, the same
 * answer as for a section that does not exist) and read ("locked"). Returns where the section is,
 * for the page to refresh.
 */
export async function setSectionRead(db: PrismaClient, { viewer, sectionId, read }: { viewer: Viewer; sectionId: string; read: boolean }) {
  const section = await db.courseSection.findFirst({
    where: { id: sectionId, chapter: { status: { in: visibleStatuses(viewer) }, certification: { active: true } } },
    select: { id: true, code: true, chapter: { select: { code: true, free: true, certificationId: true, certification: { select: { code: true } } } } },
  });
  if (!section) throw new CourseError("not_found");
  if (isLocked(section.chapter, await courseLevel(db, viewer, section.chapter.certificationId))) throw new CourseError("locked");
  const key = { userId_sectionId: { userId: viewer.userId, sectionId } };
  if (read) await db.courseProgress.upsert({ where: key, create: { userId: viewer.userId, sectionId }, update: {} });
  else await db.courseProgress.deleteMany({ where: { userId: viewer.userId, sectionId } });
  return { certification: section.chapter.certification.code, chapter: section.chapter.code, section: section.code };
}

/** A link to a section of the course, or to the offer screen when its chapter is locked. */
export interface SectionLink {
  chapter: string;
  section: string;
  title: string;
  chapterTitle: string;
  locked: boolean;
  href: string;
}

/** Sections the viewer may open, in course order, with their chapter and objectives (no body). */
async function visibleSections(db: PrismaClient, viewer: Viewer, certificationId: string, where: { objectives?: { some: { code: { in: string[] } } } } = {}) {
  const [sections, level, certification] = await Promise.all([
    db.courseSection.findMany({
      where: { ...where, chapter: { certificationId, status: { in: visibleStatuses(viewer) } } },
      orderBy: [{ chapter: { order: "asc" } }, { order: "asc" }],
      select: {
        code: true,
        title: true,
        objectives: { select: { code: true } },
        progress: { where: { userId: viewer.userId }, select: { readAt: true } },
        chapter: { select: { code: true, title: true, free: true, module: { select: { code: true } } } },
      },
    }),
    courseLevel(db, viewer, certificationId),
    db.certification.findUniqueOrThrow({ where: { id: certificationId }, select: { code: true } }),
  ]);
  return { sections, level, code: certification.code };
}

function sectionLink(s: Awaited<ReturnType<typeof visibleSections>>["sections"][number], level: AccessLevel, code: string, locale: Locale): SectionLink {
  const locked = isLocked(s.chapter, level);
  return {
    chapter: s.chapter.code,
    section: s.code,
    title: localized(s.title, locale),
    chapterTitle: localized(s.chapter.title, locale),
    locked,
    href: locked ? offerUrl(code) : `/course/${code}/${s.chapter.code}#${s.code}`,
  };
}

/**
 * The sections that cover each objective (docs/SPECS-COURS.md §7: "Review the
 * course" under each question of the correction), in course order, `limit`
 * per objective. Computed from the objectives: nothing to enter by hand.
 */
export async function sectionsForObjectives(
  db: PrismaClient,
  { certificationId, objectives, viewer, locale, limit = 2 }: { certificationId: string; objectives: readonly string[]; viewer: Viewer; locale: Locale; limit?: number },
): Promise<Map<string, SectionLink[]>> {
  const codes = [...new Set(objectives)];
  const links = new Map<string, SectionLink[]>(codes.map((c) => [c, []]));
  if (codes.length === 0) return links;
  const { sections, level, code } = await visibleSections(db, viewer, certificationId, { objectives: { some: { code: { in: codes } } } });
  for (const s of sections) {
    for (const o of s.objectives) {
      const list = links.get(o.code);
      if (list && list.length < limit) list.push(sectionLink(s, level, code, locale));
    }
  }
  return links;
}

/** The chapters of each domain (score report, §7), in course order, for the viewer. */
export async function chaptersForDomains(
  db: PrismaClient,
  { certificationId, domains, viewer, locale }: { certificationId: string; domains: readonly string[]; viewer: Viewer; locale: Locale },
): Promise<Map<string, { code: string; title: string; locked: boolean; href: string }[]>> {
  const result = new Map<string, { code: string; title: string; locked: boolean; href: string }[]>(domains.map((d) => [d, []]));
  if (domains.length === 0) return result;
  const [chapters, level, certification] = await Promise.all([
    db.courseChapter.findMany({
      where: { certificationId, status: { in: visibleStatuses(viewer) }, module: { code: { in: [...domains] } } },
      orderBy: { order: "asc" },
      select: { code: true, title: true, free: true, module: { select: { code: true } } },
    }),
    courseLevel(db, viewer, certificationId),
    db.certification.findUniqueOrThrow({ where: { id: certificationId }, select: { code: true } }),
  ]);
  for (const c of chapters) {
    const locked = isLocked(c, level);
    result.get(c.module.code)?.push({ code: c.code, title: localized(c.title, locale), locked, href: locked ? offerUrl(certification.code) : `/course/${certification.code}/${c.code}` });
  }
  return result;
}

/**
 * After a mock exam (dashboard, §7): the `limit` sections not read yet that
 * cover the most questions missed at the user's last finished exam of the
 * certification; ties in course order.
 */
export async function suggestedSections(
  db: PrismaClient,
  { certificationId, viewer, locale, limit = 3 }: { certificationId: string; viewer: Viewer; locale: Locale; limit?: number },
): Promise<SectionLink[]> {
  const last = await db.attempt.findFirst({
    where: { userId: viewer.userId, certificationId, status: { in: ["submitted", "expired"] } },
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    select: { items: { select: { pointsEarned: true, pointsMax: true, question: { select: { objective: { select: { code: true } } } } } } },
  });
  const missed = new Map<string, number>();
  for (const i of last?.items ?? []) {
    if ((i.pointsEarned ?? 0) < (i.pointsMax ?? 0)) missed.set(i.question.objective.code, (missed.get(i.question.objective.code) ?? 0) + 1);
  }
  if (missed.size === 0) return [];
  const { sections, level, code } = await visibleSections(db, viewer, certificationId, { objectives: { some: { code: { in: [...missed.keys()] } } } });
  return sections
    .filter((s) => s.progress.length === 0)
    .map((s, order) => ({ s, order, weight: s.objectives.reduce((n, o) => n + (missed.get(o.code) ?? 0), 0) }))
    .sort((a, b) => b.weight - a.weight || a.order - b.order)
    .slice(0, limit)
    .map(({ s }) => sectionLink(s, level, code, locale));
}
