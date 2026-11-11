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

export const metadata = { title: "Questions" };

const statuses: ContentStatus[] = ["draft", "needs_review", "reviewed", "published", "retired"];

export default async function AdminQuestionsPage({ searchParams }: Readonly<{ searchParams: Promise<{ type?: string; status?: string; domain?: string }> }>) {
  // Checked here too: layouts are not re-run on every navigation (Next.js guidance).
  await requireAdmin();
  const sp = await searchParams;
  const t = await getTranslations("admin");
  const locale = (await getLocale()) as Locale;
  const domains = await prisma.domain.findMany({ where: { blueprint: { current: true } }, orderBy: { order: "asc" } });

  const where: Prisma.QuestionWhereInput = {};
  if (sp.type && (questionTypes as readonly string[]).includes(sp.type)) where.type = sp.type as QuestionType;
  if (sp.status && (statuses as string[]).includes(sp.status)) where.status = sp.status as ContentStatus;
  if (sp.domain) where.objective = { domain: { code: sp.domain } };

  const questions = await prisma.question.findMany({
    where,
    include: { objective: { include: { domain: true } } },
    orderBy: [{ objective: { code: "asc" } }, { id: "asc" }],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("questions")}</h1>
      <form className="flex flex-wrap items-end gap-3" aria-label={t("filters")}>
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
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            <tr>
              <th scope="col" className="px-4 py-2">Id</th>
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
