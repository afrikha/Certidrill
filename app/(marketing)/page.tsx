import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { QuestionType } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { readSwitches } from "@/lib/settings";
import { freeExamQuota } from "@/lib/access";
import { getOffers, type Offer } from "@/lib/access/offers";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExamPreview, Icon } from "./landing-visuals";

export const dynamic = "force-dynamic";

const FORMATS = [...Object.values(QuestionType), "case_study"] as const;
const FEATURES = [
  { key: "realistic", icon: "clock" },
  { key: "variety", icon: "layers" },
  { key: "report", icon: "chat" },
  { key: "progress", icon: "trend" },
] as const;
const STEPS = ["take", "score", "learn"] as const;
const FAQ = ["dumps", "score", "resume", "free"] as const;

/**
 * The public home page. The exam format (duration, questions, pass mark) is
 * read from the current blueprint and the offers from the plan table, so the
 * page never states a figure the platform does not apply.
 */
export default async function HomePage() {
  const t = await getTranslations("home");
  const tOffer = await getTranslations("offer");
  const format = await getFormatter();
  const session = await auth();
  const [certifications, { signupOpen }, offers, quota] = await Promise.all([
    prisma.certification.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true, title: true, blueprints: { where: { current: true }, take: 1, select: { durationMin: true, minQuestions: true, maxQuestions: true, passScore: true, maxScore: true } } },
    }),
    readSwitches(prisma),
    getOffers(prisma),
    freeExamQuota(prisma),
  ]);
  const blueprint = certifications.find((c) => c.blueprints[0])?.blueprints[0];
  // Without a current blueprint, no figure is shown rather than an invented one.
  const faq = FAQ.filter((q) => blueprint || q !== "score");
  const codes = certifications.map((c) => c.code.toUpperCase()).join(" · ");
  const pass = offers.find((o) => o.kind === "pass");
  const price = (o: Offer) => format.number(o.amountCents / 100, { style: "currency", currency: o.currency.toUpperCase() });
  const freeExams = quota === null ? null : t("freeExams", { count: quota });

  // The main call to action, the same in every section that offers one.
  let primary = { href: "/login", label: t("cta") };
  if (session) primary = { href: "/dashboard", label: t("ctaDashboard") };
  else if (signupOpen) primary = { href: "/signup", label: t("ctaStart") };

  return (
    <div className="overflow-x-clip">
      {/* Hero */}
      <section className="relative isolate">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,var(--color-blue-100),transparent_60%)]" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,color-mix(in_srgb,var(--color-slate-200)_40%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,var(--color-slate-200)_40%,transparent)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 pb-24 pt-14 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:pb-28">
          <div>
            {codes && (
              <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-900">
                <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                {t("eyebrow", { codes })}
              </p>
            )}
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-balance sm:text-5xl">{t("title")}</h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground text-pretty">{blueprint ? t("subtitle", { maxScore: blueprint.maxScore }) : t("subtitleNoScore")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {session && <Link href="/dashboard" className={buttonClasses("primary", "px-5 py-3 text-base")}>{t("ctaDashboard")}</Link>}
              {!session && signupOpen && (
                <>
                  <Link href="/signup" className={buttonClasses("primary", "px-5 py-3 text-base")}>{t("ctaSignup")}</Link>
                  <Link href="/login" className={buttonClasses("secondary", "px-5 py-3 text-base")}>{t("cta")}</Link>
                </>
              )}
              {!session && !signupOpen && <Link href="/login" className={buttonClasses("primary", "px-5 py-3 text-base")}>{t("cta")}</Link>}
            </div>
            {!session && <p className="mt-4 text-sm text-muted-foreground">{signupOpen ? t("reassurance") : t("closed")}</p>}
          </div>
          {blueprint && <ExamPreview maxScore={blueprint.maxScore} passScore={blueprint.passScore} />}
        </div>
      </section>

      {/* The exam format, from the current blueprint */}
      {blueprint && (
        <section aria-label={t("factsLabel")} className="border-y border-border bg-muted/60">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 lg:grid-cols-4">
            {[
              [t("facts.duration", { minutes: blueprint.durationMin }), t("facts.durationLabel")],
              [t("facts.questions", { min: blueprint.minQuestions, max: blueprint.maxQuestions }), t("facts.questionsLabel")],
              [t("facts.pass", { pass: blueprint.passScore, max: blueprint.maxScore }), t("facts.passLabel")],
              [t("facts.formats", { count: Object.values(QuestionType).length }), t("facts.formatsLabel")],
            ].map(([value, label]) => (
              <div key={label} className="flex flex-col-reverse justify-end">
                <dt className="mt-1 text-sm text-muted-foreground">{label}</dt>
                <dd className="text-3xl font-bold tracking-tight tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight">{t("stepsTitle")}</h2>
        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((s, i) => (
            <li key={s} className="relative">
              <span aria-hidden className="grid size-10 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">{i + 1}</span>
              <h3 className="mt-4 text-lg font-semibold">{t(`steps.${s}`)}</h3>
              <p className="mt-2 text-muted-foreground">{t(`steps.${s}Text`)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section className="bg-slate-900 text-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-white">{t("featuresTitle")}</h2>
          <ul className="mt-12 grid gap-6 sm:grid-cols-2">
            {FEATURES.map(({ key, icon }) => (
              <li key={key} className="rounded-xl border border-slate-700/80 bg-slate-800/60 p-6">
                <span className="grid size-10 place-items-center rounded-lg bg-blue-500/15 text-blue-300"><Icon name={icon} /></span>
                <h3 className="mt-4 text-lg font-semibold text-white">{t(`features.${key}`)}</h3>
                <p className="mt-2 text-slate-300">{t(`features.${key}Text`)}</p>
              </li>
            ))}
          </ul>
          <h3 className="mt-16 text-sm font-semibold uppercase tracking-wider text-slate-400">{t("formatsTitle")}</h3>
          <ul className="mt-4 flex flex-wrap gap-2">
            {FORMATS.map((f) => (
              <li key={f} className="rounded-full border border-slate-700 px-3 py-1.5 text-sm text-slate-200">{t(`formats.${f}`)}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">{t("pricingTitle")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{t("pricingSubtitle")}</p>
        </div>
        <ul className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          <li className="flex flex-col rounded-2xl border border-border p-8">
            <h3 className="text-lg font-semibold">{t("free")}</h3>
            <p className="mt-4 text-4xl font-bold tracking-tight">{t("freePrice")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("freeTerms")}</p>
            <ul className="mt-6 space-y-3 text-sm">
              {[freeExams, t("freeCorrection"), t("freeProgress")].filter(Boolean).map((b) => (
                <li key={b} className="flex gap-3"><Icon name="check" className="size-5 shrink-0 text-success" />{b}</li>
              ))}
            </ul>
            <Link href={primary.href} className={buttonClasses("secondary", "mt-8 py-2.5")}>{primary.label}</Link>
          </li>
          {pass && (
            <li className="relative flex flex-col rounded-2xl border-2 border-primary p-8 shadow-lg shadow-blue-900/10">
              <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">{t("popular")}</span>
              <h3 className="text-lg font-semibold">{tOffer("name_pass")}</h3>
              <p className="mt-4 text-4xl font-bold tracking-tight tabular-nums">{price(pass)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {tOffer("termsPass", { tax: tOffer(pass.taxBehavior === "inclusive" ? "taxIncluded" : "taxExcluded"), days: pass.durationDays ?? 0 })}
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {(["benefitExams", "benefitCorrection", "benefitProgress"] as const).map((k) => (
                  <li key={k} className="flex gap-3"><Icon name="check" className="size-5 shrink-0 text-primary" />{tOffer(k)}</li>
                ))}
              </ul>
              <p className="mt-auto pt-8 text-center text-sm text-muted-foreground">{t("soonHint")}</p>
            </li>
          )}
        </ul>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-muted/60">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight">{t("faqTitle")}</h2>
          <div className="mt-10 divide-y divide-border rounded-xl border border-border bg-background">
            {faq.map((q) => (
              <details key={q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {t(`faq.${q}Q`)}
                  <span aria-hidden className="text-xl leading-none text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-muted-foreground">{t(`faq.${q}A`, { maxScore: blueprint?.maxScore ?? 0, passScore: blueprint?.passScore ?? 0, exams: freeExams ?? "" })}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final call to action */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
          <div aria-hidden className="absolute -right-20 -top-20 size-72 rounded-full bg-white/10" />
          <div aria-hidden className="absolute -bottom-24 -left-16 size-64 rounded-full bg-white/5" />
          <h2 className="relative text-3xl font-bold tracking-tight">{t("finalTitle")}</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-blue-100">{t("finalText")}</p>
          <Link href={primary.href} className={cn(buttonClasses("secondary", "relative mt-8 border-transparent px-6 py-3 text-base text-primary"), "hover:bg-blue-50")}>
            {primary.label}
          </Link>
        </div>
        {certifications.length > 0 && (
          <div className="mt-12 text-center">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("available")}</h2>
            <ul className="mt-4 flex flex-wrap justify-center gap-3">
              {certifications.map((c) => (
                <li key={c.id} className="rounded-md border border-border px-4 py-2">
                  <span className="font-mono text-sm font-semibold uppercase">{c.code}</span> — {c.title}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
