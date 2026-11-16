import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { recentAudit } from "@/lib/audit";
import { CHAPTER_STATUSES, coursesForAdmin } from "@/lib/course/admin";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { setChapterStatusAction } from "@/lib/actions/course";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Course" };
export const dynamic = "force-dynamic";

/** Back-office of the course (docs/SPECS-COURS.md §9): chapters, statuses, reading statistics. */
export default async function AdminCoursePage() {
  // Checked here too: layouts are not re-run on every navigation (Next.js guidance).
  await requireAdmin();
  const current = await getLocale();
  const locale = isLocale(current) ? current : defaultLocale;
  const t = await getTranslations("courseAdmin");
  const tCourse = await getTranslations("course");
  const format = await getFormatter();
  const [courses, log] = await Promise.all([coursesForAdmin(prisma, locale), recentAudit(prisma, { action: "course.status", take: 20 })]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("intro")}</p>
      </header>

      {courses.length === 0 && <p className="text-muted-foreground">{t("none")}</p>}
      {courses.map((course) => {
        const published = course.chapters.filter((c) => c.status === "published").length;
        return (
          <section key={course.certification.code} className="space-y-3" aria-labelledby={`course-${course.certification.code}`}>
            <h2 id={`course-${course.certification.code}`} className="text-xl font-semibold">
              <span className="font-mono uppercase">{course.certification.code}</span> — {course.certification.title}
            </h2>
            <p className="text-sm text-muted-foreground">{t("summary", { chapters: course.chapters.length, published })}</p>
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th scope="col" className="px-4 py-2">{t("chapter")}</th>
                    <th scope="col" className="px-4 py-2">{t("access")}</th>
                    <th scope="col" className="px-4 py-2">{t("status")}</th>
                    <th scope="col" className="px-4 py-2 text-right">{t("sections")}</th>
                    <th scope="col" className="px-4 py-2">{t("updated")}</th>
                    <th scope="col" className="px-4 py-2 text-right">{t("readers")}</th>
                    <th scope="col" className="px-4 py-2 text-right">{t("sectionsRead")}</th>
                  </tr>
                </thead>
                <tbody>
                  {course.chapters.map((c) => (
                    <tr key={c.id} className="border-t border-border align-top" data-testid="admin-course-chapter" data-chapter={c.code}>
                      <td className="px-4 py-2">
                        <Link href={`/admin/course/${course.certification.code}/${c.code}`} className="font-medium text-primary underline">{c.title}</Link>
                        <span className="block font-mono text-xs text-muted-foreground">{c.code} · {c.module}</span>
                      </td>
                      <td className="px-4 py-2">{c.free ? t("free") : t("full")}</td>
                      <td className="px-4 py-2">
                        <form action={setChapterStatusAction} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="chapter" value={c.id} />
                          <Select name="status" defaultValue={c.status} aria-label={t("statusOf", { chapter: c.title })} className="w-auto">
                            {CHAPTER_STATUSES.map((s) => <option key={s} value={s}>{tCourse(`status_${s}`)}</option>)}
                          </Select>
                          <Button type="submit" variant="secondary" className="px-3 py-1">{t("save")}</Button>
                        </form>
                        {c.fileStatus !== c.status && (
                          <span className="mt-1 block text-xs text-muted-foreground">{t("fileStatus", { status: tCourse(`status_${c.fileStatus}`) })}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{c.sections}</td>
                      <td className="whitespace-nowrap px-4 py-2">{format.dateTime(c.contentUpdatedAt, { dateStyle: "medium" })}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{c.readers}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{c.sectionsRead}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>
        );
      })}

      <section className="space-y-3" aria-labelledby="course-history">
        <h2 id="course-history" className="text-xl font-semibold">{t("history")}</h2>
        {log.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noHistory")}</p>
        ) : (
          <ul className="space-y-1 text-sm" data-testid="admin-course-history">
            {log.map((entry) => {
              const d = entry.details as { chapter?: string; from?: string; to?: string };
              return (
                <li key={entry.id}>
                  <span className="text-muted-foreground">{format.dateTime(entry.createdAt, { dateStyle: "short", timeStyle: "short" })}</span>{" "}
                  {t("changed", {
                    who: entry.actor?.email ?? t("cli"),
                    chapter: d.chapter ?? "?",
                    from: d.from ? tCourse(`status_${d.from}`) : "?",
                    to: d.to ? tCourse(`status_${d.to}`) : "?",
                  })}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
