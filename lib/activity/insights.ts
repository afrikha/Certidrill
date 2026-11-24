/**
 * What the administrators need to improve the site (/admin/activity, below
 * the daily overview): exams and course by certification, the sign-up funnel
 * and how many come back. Counted from the tables the site keeps anyway, like
 * ./overview.ts: nothing more is collected. Administrator accounts are left
 * out, so the owner's own trials do not skew the figures.
 *
 * The rows are read and counted here, which is light at the site's volume.
 */
import type { PrismaClient } from "@prisma/client";

const DAY_MS = 86_400_000;

export type ChapterReaders = { code: string; title: { en: string; fr: string }; readers: number };

export type CertificationInsight = {
  code: string;
  title: string;
  active: boolean;
  /** Mock exams started over the period, and those of them handed in or expired. */
  examsStarted: number;
  examsFinished: number;
  /** Practice sessions started over the period. */
  practiceStarted: number;
  /** Over the finished mock exams with a score; null without any. */
  averageScore: number | null;
  passRate: number | null;
  /** Users who read at least one section of the course, since the start. */
  courseReaders: number;
  /** Chapters with every section read, on average per reader; null without readers. */
  chaptersCompletedAvg: number | null;
  chapters: number;
  /** The chapters with the most and the fewest readers (at most 3 each). */
  topChapters: ChapterReaders[];
  bottomChapters: ChapterReaders[];
};

export type Funnel = { signups: number; verified: number; firstExam: number; purchased: number };

export type Retention = {
  /** Accounts old enough to be counted (at least 7 or 30 days), and those active again from that day. */
  day7: { cohort: number; returned: number };
  day30: { cohort: number; returned: number };
};

export type SiteInsights = { certifications: CertificationInsight[]; funnel: Funnel; retention: Retention };

const notAdmin = { role: "user" } as const;
const rate = (n: number, of: number) => (of === 0 ? null : n / of);

function chapterTitle(title: unknown, code: string): { en: string; fr: string } {
  const t = (title ?? {}) as Partial<Record<"en" | "fr", unknown>>;
  const en = typeof t.en === "string" ? t.en : code;
  return { en, fr: typeof t.fr === "string" ? t.fr : en };
}

/**
 * Exams over the last `days` days, the course since the start, the funnel of
 * the accounts created over the last `days` days and the retention of those
 * created over the last `cohortDays` days.
 */
export async function siteInsights(db: PrismaClient, now = new Date(), days = 30, cohortDays = 90): Promise<SiteInsights> {
  const since = new Date(now.getTime() - days * DAY_MS);
  const cohortSince = new Date(now.getTime() - cohortDays * DAY_MS);
  const [certifications, attempts, chapters, progress, funnel, retention] = await Promise.all([
    db.certification.findMany({ select: { id: true, code: true, title: true, active: true }, orderBy: { code: "asc" } }),
    db.attempt.findMany({
      where: { createdAt: { gte: since, lte: now }, user: notAdmin },
      select: { certificationId: true, mode: true, status: true, scaledScore: true, passed: true },
    }),
    db.courseChapter.findMany({ select: { certificationId: true, code: true, order: true, title: true, sections: { select: { id: true } } }, orderBy: { order: "asc" } }),
    db.courseProgress.findMany({ where: { user: notAdmin }, select: { userId: true, sectionId: true } }),
    signupFunnel(db, since, now),
    signupRetention(db, cohortSince, now),
  ]);

  const readBy = new Map<string, Set<string>>();
  for (const p of progress) {
    const users = readBy.get(p.sectionId) ?? new Set<string>();
    users.add(p.userId);
    readBy.set(p.sectionId, users);
  }

  const insights = certifications.map((c): CertificationInsight => {
    const mine = attempts.filter((a) => a.certificationId === c.id);
    const exams = mine.filter((a) => a.mode === "exam");
    const finished = exams.filter((a) => a.status !== "in_progress");
    const scored = finished.filter((a) => a.scaledScore !== null);
    const sum = scored.reduce((n, a) => n + a.scaledScore!, 0);

    const own = chapters.filter((ch) => ch.certificationId === c.id);
    const readers = new Set<string>();
    let completions = 0;
    const perChapter = own.map((ch): ChapterReaders => {
      const users = new Set<string>();
      const sets = ch.sections.map((s) => readBy.get(s.id) ?? new Set<string>());
      for (const set of sets) for (const u of set) users.add(u);
      for (const u of users) {
        readers.add(u);
        if (sets.length > 0 && sets.every((set) => set.has(u))) completions += 1;
      }
      return { code: ch.code, title: chapterTitle(ch.title, ch.code), readers: users.size };
    });
    const ranked = [...perChapter].sort((a, b) => b.readers - a.readers);
    const shown = Math.min(3, Math.floor(ranked.length / 2));
    return {
      code: c.code,
      title: c.title,
      active: c.active,
      examsStarted: exams.length,
      examsFinished: finished.length,
      practiceStarted: mine.length - exams.length,
      averageScore: scored.length === 0 ? null : Math.round(sum / scored.length),
      passRate: rate(scored.filter((a) => a.passed).length, scored.length),
      courseReaders: readers.size,
      chaptersCompletedAvg: readers.size === 0 ? null : completions / readers.size,
      chapters: own.length,
      topChapters: readers.size === 0 ? [] : ranked.slice(0, shown),
      bottomChapters: readers.size === 0 ? [] : ranked.slice(ranked.length - shown).reverse(),
    };
  });

  return { certifications: insights, funnel, retention };
}

/** The accounts created over the period, and how far they went since. */
async function signupFunnel(db: PrismaClient, since: Date, now: Date): Promise<Funnel> {
  const users = await db.user.findMany({ where: { ...notAdmin, createdAt: { gte: since, lte: now } }, select: { id: true, emailVerified: true } });
  const ids = users.map((u) => u.id);
  const [exams, paid] = await Promise.all([
    db.attempt.findMany({ where: { userId: { in: ids } }, select: { userId: true }, distinct: ["userId"] }),
    // A Pass bought, refunded since or not: the step was taken.
    db.entitlement.findMany({ where: { userId: { in: ids }, payment: { status: { in: ["paid", "refunded", "disputed"] } } }, select: { userId: true }, distinct: ["userId"] }),
  ]);
  return { signups: users.length, verified: users.filter((u) => u.emailVerified).length, firstExam: exams.length, purchased: paid.length };
}

/**
 * Of the accounts created over the period, those active again (signed in,
 * started an exam or read the course) 7 and 30 days or more after their
 * creation. A user who stays signed in and only reads sections already read
 * leaves no trace: the figure is a floor.
 */
async function signupRetention(db: PrismaClient, since: Date, now: Date): Promise<Retention> {
  const users = await db.user.findMany({ where: { ...notAdmin, createdAt: { gte: since, lte: now } }, select: { id: true, createdAt: true } });
  const ids = users.map((u) => u.id);
  const [logins, attempts, progress] = await Promise.all([
    db.loginEvent.findMany({ where: { userId: { in: ids }, kind: { in: ["password", "magic_link"] } }, select: { userId: true, createdAt: true } }),
    db.attempt.findMany({ where: { userId: { in: ids } }, select: { userId: true, createdAt: true } }),
    db.courseProgress.findMany({ where: { userId: { in: ids } }, select: { userId: true, readAt: true } }),
  ]);
  const last = new Map<string, number>();
  const seen = (userId: string, at: Date) => last.set(userId, Math.max(last.get(userId) ?? 0, at.getTime()));
  for (const l of logins) seen(l.userId, l.createdAt);
  for (const a of attempts) seen(a.userId, a.createdAt);
  for (const p of progress) seen(p.userId, p.readAt);

  const after = (days: number) => {
    const cohort = users.filter((u) => now.getTime() - u.createdAt.getTime() >= days * DAY_MS);
    const returned = cohort.filter((u) => (last.get(u.id) ?? 0) >= u.createdAt.getTime() + days * DAY_MS);
    return { cohort: cohort.length, returned: returned.length };
  };
  return { day7: after(7), day30: after(30) };
}
