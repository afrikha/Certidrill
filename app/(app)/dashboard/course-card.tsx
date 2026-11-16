import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { CourseOutline } from "@/lib/course/read";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/course/progress-bar";

/** The course on the dashboard: progress and the next chapter to read. */
export async function CourseCard({ outline }: Readonly<{ outline: CourseOutline }>) {
  const t = await getTranslations("course");
  const code = outline.certification.code;
  return (
    <Card className="space-y-4" data-testid="dashboard-course">
      <h2 className="font-semibold">
        <Link href={`/course/${code}`} className="hover:underline">{t("dashboardTitle", { code: code.toUpperCase() })}</Link>
      </h2>
      <ProgressBar read={outline.read} total={outline.sections} label={t("progressLabel")} text={t("progress", { read: outline.read, total: outline.sections })} />
      {outline.resume ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href={`/course/${code}/${outline.resume.chapter}#${outline.resume.section}`} className={buttonClasses("secondary")}>
            {outline.read === 0 ? t("start") : t("resume", { chapter: outline.resume.chapterTitle })}
          </Link>
          {outline.read === 0 && <span className="text-sm text-muted-foreground">{t("dashboardNext", { chapter: outline.resume.chapterTitle })}</span>}
        </div>
      ) : (
        <p className="font-semibold text-success">{t("done")}</p>
      )}
    </Card>
  );
}
