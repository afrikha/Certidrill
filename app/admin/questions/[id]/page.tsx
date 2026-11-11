import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { isLocale, pick, type Locale } from "@/lib/i18n/config";
import { presentQuestion } from "@/lib/questions/present";
import { buildOptionOrder } from "@/lib/questions/order";
import { renderMarkdown } from "@/lib/markdown";
import { Card } from "@/components/ui/card";
import { Preview } from "./preview";

export const metadata = { title: "Question preview" };

export default async function QuestionPreviewPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string; shuffle?: string }>;
}) {
  // Checked here too: layouts are not re-run on every navigation (Next.js guidance).
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const locale: Locale = isLocale(sp.lang) ? sp.lang : "en";
  const t = await getTranslations("admin");
  const q = await prisma.question.findUnique({ where: { id }, include: { series: true, objective: true } });
  if (!q) notFound();

  const order = sp.shuffle ? buildOptionOrder(q.type, q.body, q.shuffle, Math.random) : {};
  const question = await presentQuestion(q, locale, order);
  const seriesStemHtml = q.series ? await renderMarkdown(pick(q.series.stem as { en: string; fr: string }, locale)) : undefined;
  const explanation = q.explanation as { correct: { en: string; fr: string }; options?: Record<string, { en: string; fr: string }> };
  const explanationHtml = await renderMarkdown(pick(explanation.correct, locale));

  const link = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams({ lang: locale, ...(sp.shuffle ? { shuffle: "1" } : {}) });
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    return `/admin/questions/${q.id}?${next}`;
  };

  return (
    <div className="space-y-6">
      <p className="text-sm"><Link href="/admin/questions" className="text-primary underline">← {t("questions")}</Link></p>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-mono text-xl font-bold">{q.id}</h1>
        <div className="flex gap-3 text-sm">
          <Link href={link({ lang: "en" })} aria-current={locale === "en"} className={locale === "en" ? "font-bold" : "underline"}>EN</Link>
          <Link href={link({ lang: "fr" })} aria-current={locale === "fr"} className={locale === "fr" ? "font-bold" : "underline"}>FR</Link>
          <Link href={link({ shuffle: sp.shuffle ? undefined : "1" })} className="underline">{sp.shuffle ? t("naturalOrder") : t("shuffle")}</Link>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {q.type} · {t("objective")} {q.objective.code} · {t("difficulty")} {q.difficulty} · {q.status} · {t("maxPoints", { n: question.maxPoints })}
      </p>
      <Card>
        <Preview question={question} seriesStemHtml={seriesStemHtml} />
      </Card>
      <details className="rounded-md border border-border p-4">
        <summary className="cursor-pointer font-semibold">{t("answerKey")}</summary>
        <pre className="mt-3 overflow-x-auto rounded bg-muted p-3 text-xs">{JSON.stringify(q.answer, null, 2)}</pre>
        <div className="prose-q mt-3" dangerouslySetInnerHTML={{ __html: explanationHtml }} />
        <ul className="mt-3 list-disc pl-6 text-sm">
          {(q.references as { title: string; url: string }[]).map((r) => (
            <li key={r.url}><a href={r.url} className="text-primary underline" target="_blank" rel="noreferrer">{r.title}</a></li>
          ))}
        </ul>
      </details>
    </div>
  );
}
