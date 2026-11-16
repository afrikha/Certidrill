/**
 * The course in the back-office (docs/SPECS-COURS.md §9): every chapter with
 * its status and simple reading statistics, a status change recorded in the
 * audit log, and a chapter in both languages for review. For administrators
 * only: the pages and the action check the role, these functions do not.
 */
import { Prisma, type ContentStatus, type PrismaClient } from "@prisma/client";
import { audit } from "@/lib/audit";
import { pick, type Locale, type Localized } from "@/lib/i18n/config";

export const CHAPTER_STATUSES: readonly ContentStatus[] = ["draft", "needs_review", "reviewed", "published", "retired"];

export const isChapterStatus = (value: unknown): value is ContentStatus => (CHAPTER_STATUSES as readonly unknown[]).includes(value);

export interface AdminChapter {
  id: string;
  code: string;
  title: string;
  module: string;
  free: boolean;
  status: ContentStatus;
  /** The status course.yaml gives: a different status was set in the back-office. */
  fileStatus: ContentStatus;
  sections: number;
  /** Last change of the chapter's text or of one of its sections. */
  contentUpdatedAt: Date;
  /** Users who read at least one section. */
  readers: number;
  /** Sections marked read, all users together. */
  sectionsRead: number;
}

export interface AdminCourse {
  certification: { code: string; title: string };
  chapters: AdminChapter[];
}

/** Every course and its chapters, in course order, with their reading statistics. */
export async function coursesForAdmin(db: PrismaClient, locale: Locale): Promise<AdminCourse[]> {
  const [chapters, stats] = await Promise.all([
    db.courseChapter.findMany({
      orderBy: [{ certification: { code: "asc" } }, { order: "asc" }],
      select: {
        id: true,
        code: true,
        title: true,
        free: true,
        status: true,
        fileStatus: true,
        contentUpdatedAt: true,
        certification: { select: { code: true, title: true } },
        module: { select: { title: true } },
        sections: { select: { contentUpdatedAt: true } },
      },
    }),
    db.$queryRaw<{ chapterId: string; readers: number; reads: number }[]>(Prisma.sql`
      SELECT s."chapterId", COUNT(DISTINCT p."userId")::int AS readers, COUNT(*)::int AS reads
      FROM "course_progress" p JOIN "course_section" s ON s."id" = p."sectionId"
      GROUP BY s."chapterId"`),
  ]);
  const byChapter = new Map(stats.map((s) => [s.chapterId, s]));
  const courses = new Map<string, AdminCourse>();
  for (const c of chapters) {
    const course = courses.get(c.certification.code) ?? { certification: c.certification, chapters: [] };
    courses.set(c.certification.code, course);
    const updated = Math.max(c.contentUpdatedAt.getTime(), ...c.sections.map((s) => s.contentUpdatedAt.getTime()));
    course.chapters.push({
      id: c.id,
      code: c.code,
      title: pick(c.title as Localized, locale),
      module: pick(c.module.title as Localized, locale),
      free: c.free,
      status: c.status,
      fileStatus: c.fileStatus,
      sections: c.sections.length,
      contentUpdatedAt: new Date(updated),
      readers: byChapter.get(c.id)?.readers ?? 0,
      sectionsRead: byChapter.get(c.id)?.reads ?? 0,
    });
  }
  return [...courses.values()];
}

/**
 * Changes a chapter's status, with its trace in the audit log (same
 * transaction). Setting the current status again is not recorded. False when
 * nothing changed, null when the chapter does not exist.
 */
export async function setChapterStatus(db: PrismaClient, actorId: string, chapterId: string, status: ContentStatus): Promise<boolean | null> {
  return db.$transaction(async (tx) => {
    const chapter = await tx.courseChapter.findUnique({ where: { id: chapterId }, select: { code: true, status: true, certification: { select: { code: true } } } });
    if (!chapter) return null;
    if (chapter.status === status) return false;
    await tx.courseChapter.update({ where: { id: chapterId }, data: { status } });
    await audit(tx, {
      actorId,
      action: "course.status",
      details: { certification: chapter.certification.code, chapter: chapter.code, from: chapter.status, to: status },
    });
    return true;
  });
}

export interface ReviewSection {
  id: string;
  code: string;
  title: Localized;
  body: Localized;
  contentHash: string;
  objectives: { code: string; title: Localized }[];
}

export interface ReviewChapter {
  id: string;
  code: string;
  certification: string;
  title: Localized;
  module: Localized;
  summary: Localized;
  minutes: number;
  free: boolean;
  status: ContentStatus;
  fileStatus: ContentStatus;
  contentHash: string;
  references: { title: string; url: string }[];
  sections: ReviewSection[];
}

/** A chapter in both languages, whatever its status: what the review needs. Null when it does not exist. */
export async function chapterForReview(db: PrismaClient, certification: string, code: string): Promise<ReviewChapter | null> {
  const c = await db.courseChapter.findFirst({
    where: { code, certification: { code: certification } },
    include: {
      module: { select: { title: true } },
      sections: { orderBy: { order: "asc" }, include: { objectives: { orderBy: { code: "asc" }, select: { code: true, title: true } } } },
    },
  });
  if (!c) return null;
  return {
    id: c.id,
    code: c.code,
    certification,
    title: c.title as Localized,
    module: c.module.title as Localized,
    summary: c.summary as Localized,
    minutes: c.minutes,
    free: c.free,
    status: c.status,
    fileStatus: c.fileStatus,
    contentHash: c.contentHash,
    references: (c.references ?? []) as { title: string; url: string }[],
    sections: c.sections.map((s) => ({
      id: s.id,
      code: s.code,
      title: s.title as Localized,
      body: s.body as Localized,
      contentHash: s.contentHash,
      objectives: s.objectives.map((o) => ({ code: o.code, title: o.title as Localized })),
    })),
  };
}
