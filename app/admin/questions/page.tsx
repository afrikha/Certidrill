import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { ContentStatus, Prisma, QuestionType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { pick, type Locale } from "@/lib/i18n/config";
import { questionTypes } from "@/lib/content/schema";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QuestionBatchForm } from "../certifications/forms";
import { BATCH_STATUSES, type BatchStatus } from "@/lib/content/batch-status";
import { groupsToPublish } from "@/lib/content/publish";
import { withUsage } from "@/lib/questions/usage";

export const metadata = { title: "Questions" };

const statuses: ContentStatus[] = ["draft", "needs_review", "reviewed", "published", "retired"];

export default async function AdminQuestionsPage({ searchParams }: Readonly<{ searchParams: Promise<{ type?: string; status?: string; domain?: string; certification?: string; usage?: string; chapter?: string }> }>) {
  // Checked here too: layouts are not re-run on every navigation (Next.js guidance).
  await requireAdmin();
  const sp = await searchParams;
  const t = await getTranslations("admin");
  const locale = (await getLocale()) as Locale;
  // One certification at a time (the first active one by default): domain codes repeat across certifications.
  const certifications = await prisma.certification.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, title: true, active: true } });
  const certification = certifications.find((c) => c.code === sp.certification) ?? certifications.find((c) => c.active) ?? certifications[0];
  const domains = await prisma.domain.findMany({ where: { blueprint: { current: true, certificationId: certification?.id ?? "" } }, orderBy: { order: "asc" } });

  // The exam bank by default; chapter quizzes on demand (never mixed: a batch publishes one or the other).
  const usage = sp.usage === "quiz" ? "quiz" : "exam";
  const chapters = usage === "quiz" ? await prisma.courseChapter.findMany({ where: { certificationId: certification?.id ?? "", quizQuestions: { some: {} } }, orderBy: { order: "asc" }, select: { code: true, title: true } }) : [];
  const chapter = chapters.some((c) => c.code === sp.chapter) ? sp.chapter : undefined;
  const where: Prisma.QuestionWhereInput = withUsage(usage, { certificationId: certification?.id ?? "" });
  if (chapter) where.chapter = { code: chapter };
  const type = sp.type && (questionTypes as readonly string[]).includes(sp.type) ? (sp.type as QuestionType) : undefined;
  const status = sp.status && (statuses as string[]).includes(sp.status) ? (sp.status as ContentStatus) : undefined;
  const domain = domains.some((d) => d.code === sp.domain) ? sp.domain : undefined;
  if (type) where.type = type;
  if (status) where.status = status;
  if (domain) where.objective = { domain: { code: domain, blueprint: { current: true } } };

  const questions = await prisma.question.findMany({
    where,
    include: { objective: { include: { domain: true } }, chapter: { select: { code: true } } },
    // A quiz in its order (chapter, then position); the bank by objective.
    orderBy: usage === "quiz" ? [{ chapter: { order: "asc" } }, { quizPosition: "asc" }] : [{ objective: { code: "asc" } }, { id: "asc" }],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("questions")}</h1>
      <form className="flex flex-wrap items-end gap-3" aria-label={t("filters")}>
        <label className="text-sm">{t("certification")}
          <Select name="certification" defaultValue={certification?.code ?? ""} className="mt-1">
            {certifications.map((c) => <option key={c.code} value={c.code}>{c.code.toUpperCase()}{c.active ? "" : ` (${t("inactive")})`}</option>)}
          </Select>
        </label>
        <label className="text-sm">{t("usage")}
          <Select name="usage" defaultValue={usage} className="mt-1">
            <option value="exam">{t("usage_exam")}</option>
            <option value="quiz">{t("usage_quiz")}</option>
          </Select>
        </label>
        {usage === "quiz" && (
          <label className="text-sm">{t("chapter")}
            <Select name="chapter" defaultValue={chapter ?? ""} className="mt-1">
              <option value="">{t("all")}</option>
              {chapters.map((c) => <option key={c.code} value={c.code}>{c.code} — {pick(c.title as { en: string; fr: string }, locale)}</option>)}
            </Select>
          </label>
        )}
        <label className="text-sm">{t("type")}
          <Select name="type" defaultValue={sp.type ?? ""} className="mt-1">
            <option value="">{t("all")}</option>
            {questionTypes.map((x) => <option key={x} value={x}>{x}</option>)}
          </Select>
        </label>
        <label className="text-sm">{t("status")}
          <Select name="status" defaultValue={sp.status ?? ""} className="mt-1">
            <option value="">{t("all")}</option>
            {statuses.map((x) => <option key={x} value={x}>{x}</option>)}
          </Select>
        </label>
        <label className="text-sm">{t("domain")}
          <Select name="domain" defaultValue={sp.domain ?? ""} className="mt-1">
            <option value="">{t("all")}</option>
            {domains.map((d) => <option key={d.id} value={d.code}>{pick(d.title as { en: string; fr: string }, locale)}</option>)}
          </Select>
        </label>
        <Button type="submit" variant="secondary">{t("filter")}</Button>
      </form>
      <p className="text-sm text-muted-foreground">{t("count", { count: questions.length })}</p>
      {certification && (
        <QuestionBatchForm
          // A new form (and result) for every filter.
          key={`${certification.code}-${usage}-${chapter ?? ""}-${type ?? ""}-${status ?? ""}-${domain ?? ""}`}
          code={certification.code}
          filters={{ usage, chapter, type, status, domain }}
          groups={await groupsToPublish(prisma, certification.id, { usage, chapter, type, status, domain })}
          byStatus={Object.fromEntries(BATCH_STATUSES.map((s) => [s, questions.filter((q) => q.status === s).length])) as Record<BatchStatus, number>}
        />
      )}
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            <tr>
              <th scope="col" className="px-4 py-2">Id</th>
              {usage === "quiz" && <th scope="col" className="px-4 py-2">{t("quizPosition")}</th>}
              <th scope="col" className="px-4 py-2">{t("type")}</th>
              <th scope="col" className="px-4 py-2">{t("objective")}</th>
              <th scope="col" className="px-4 py-2">{t("difficulty")}</th>
              <th scope="col" className="px-4 py-2">{t("status")}</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q.id} className="border-t border-border">
                <td className="px-4 py-2 font-mono"><Link className="text-primary underline" href={`/admin/questions/${q.id}`}>{q.id}</Link></td>
                {usage === "quiz" && <td className="px-4 py-2 font-mono text-xs">{q.chapter?.code} · {q.quizPosition}</td>}
                <td className="px-4 py-2 font-mono text-xs">{q.type}</td>
                <td className="px-4 py-2">{q.objective.code} — {pick(q.objective.title as { en: string; fr: string }, locale)}</td>
                <td className="px-4 py-2">{q.difficulty}</td>
                <td className="px-4 py-2">{q.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
