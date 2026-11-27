import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getQuizPage, QuizError } from "@/lib/course/quiz";
import { QUIZ_RULES } from "@/lib/course/quiz-rules";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { Alert, Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { EnglishOnlyNotice } from "@/components/english-only";
import { QuizClient } from "./quiz-client";

export const metadata = { title: "Quiz" };
export const dynamic = "force-dynamic";

/** The quiz of a chapter (docs/SPECS-QUIZ-CHAPITRE.md §3): intro, questions one at a time with their correction, result. */
export default async function ChapterQuizPage({ params }: Readonly<{ params: Promise<{ certification: string; chapter: string }> }>) {
  const { certification, chapter } = await params;
  const user = await requireUser();
  const current = await getLocale();
  const locale = isLocale(current) ? current : defaultLocale;
  const page = await getQuizPage(prisma, { certification, chapter, viewer: { userId: user.id, isAdmin: user.role === "admin" }, locale }).catch((err: unknown) => {
    if (err instanceof QuizError) return null;
    throw err;
  });
  if (!page) notFound();
  const t = await getTranslations("quiz");
  const contentLocale = page.certification.languages.includes(locale) ? locale : "en";
  const chapterHref = `/course/${page.certification.code}/${page.chapter.code}`;
  const hardN = QUIZ_RULES.length - QUIZ_RULES.easy;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-3">
        <p className="text-sm"><Link href={chapterHref} className="text-primary underline">← {t("backToChapter")}</Link></p>
        <h1 className="text-2xl font-bold">{t("title", { chapter: page.chapter.title })}</h1>
        <EnglishOnlyNotice languages={page.certification.languages} />
        {page.preview && <Alert>{t("preview")}</Alert>}
      </header>
      {page.locked ? (
        <Card className="space-y-3 border-primary bg-primary/5" data-testid="quiz-locked">
          <h2 className="font-semibold">{t("lockedTitle")}</h2>
          <p className="text-sm">{t("lockedText")}</p>
          <Link href={page.offerUrl} className={buttonClasses("primary")}>{t("unlock")}</Link>
        </Card>
      ) : (
        <>
          <Card className="space-y-2 text-sm">
            <p>{t("intro", { n: QUIZ_RULES.length, easy: QUIZ_RULES.easy })}</p>
            <p className="text-muted-foreground">{t("rule", { total: QUIZ_RULES.passTotal, n: QUIZ_RULES.length, hard: QUIZ_RULES.passHard, hardN })}</p>
          </Card>
          <div lang={contentLocale}>
            <QuizClient
              certification={page.certification.code}
              chapter={page.chapter.code}
              attempt={page.attempt}
              last={page.last}
              best={page.best}
              rules={{ length: QUIZ_RULES.length, easy: QUIZ_RULES.easy }}
            />
          </div>
        </>
      )}
    </div>
  );
}
