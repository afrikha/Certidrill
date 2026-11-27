import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { QuestionType } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { readSwitches } from "@/lib/settings";
import { freeExamQuota } from "@/lib/access";
import { getOffers, type Offer } from "@/lib/access/offers";
import { passPricing } from "@/lib/billing/checkout";
import { stripeApi } from "@/lib/billing/stripe";
import { taxLabelKey } from "@/lib/billing/terms";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { localizedPath } from "@/lib/i18n/routing";
import { SITE_NAME, activeCodes, jsonLd, publicPageMetadata, siteUrl } from "@/lib/seo";
import { activeCatalog, joinNames } from "@/lib/catalog";
import { groupByVendor } from "@/lib/vendors";
import { VendorGroups } from "@/components/vendor-groups";
import { isPerformance, PerformanceBadge } from "@/components/performance";
import { isExerciseType } from "@/lib/exercises/grade";
import { EnglishOnlyBadge } from "@/components/english-only";
import { CorrectionPreview, CoursePreview, ExamPreview, Icon, MasteryPreview, OverviewPreview, QuizPreview, XpPreview, type IconName } from "./landing-visuals";

export const dynamic = "force-dynamic";

async function pageLocale(): Promise<Locale> {
  const locale = await getLocale();
  return isLocale(locale) ? locale : defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t, codes, catalog] = await Promise.all([pageLocale(), getTranslations("seo"), activeCodes(), activeCatalog()]);
  // Case studies and Yes/No series only when an active exam has them; the documentation of the vendors on sale.
  const features = [catalog.caseStudies && t("featureCaseStudies"), catalog.series && t("featureSeries"), t("featureReview")].filter(Boolean).join(", ");
  const docs = catalog.vendors.length ? joinNames(locale, catalog.vendors.map((v) => v.docsName)) : t("docsFallback");
  return publicPageMetadata({ locale, path: "/", title: t("homeTitle", { codes }), description: t("homeDescription", { codes, features, docsNames: docs }), imageAlt: t("shareImageAlt") });
}

/** schema.org: who publishes the site, and the site itself in the language of the page. */
function structuredData(locale: Locale, description: string) {
  const base = siteUrl();
  const home = base ? new URL(localizedPath(locale, "/"), base).href : undefined;
  const organization = `${base?.origin ?? ""}/#organization`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": organization, name: SITE_NAME, ...(base && { url: base.origin }) },
      { "@type": "WebSite", name: SITE_NAME, description, inLanguage: locale, publisher: { "@id": organization }, ...(home && { url: home }) },
    ],
  };
}

const FORMATS = [...Object.values(QuestionType), "case_study"] as const;
const STEPS = [
  { key: "learn", icon: "book" },
  { key: "practice", icon: "clock" },
  { key: "review", icon: "chat" },
  { key: "pass", icon: "award" },
] as const satisfies readonly { key: string; icon: IconName }[];
const FAQ = ["dumps", "score", "languages", "resume", "free", "several"] as const;

/** A section heading: a short label above, the title, an optional subtitle. */
function SectionHeading({ id, eyebrow, title, subtitle, dark = false }: Readonly<{ id: string; eyebrow: string; title: string; subtitle?: string; dark?: boolean }>) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className={cn("text-sm font-semibold uppercase tracking-wider", dark ? "text-blue-300" : "text-primary")}>{eyebrow}</p>
      <h2 id={id} className={cn("mt-2 text-3xl font-bold tracking-tight text-balance sm:text-4xl", dark && "text-white")}>{title}</h2>
      {subtitle && <p className={cn("mt-4 text-lg text-pretty", dark ? "text-slate-300" : "text-muted-foreground")}>{subtitle}</p>}
    </div>
  );
}

/** A card of the features grid. */
function Feature({ icon, title, text, className, children }: Readonly<{ icon: IconName; title: string; text: string; className?: string; children?: React.ReactNode }>) {
  return (
    <li className={cn("group flex flex-col rounded-2xl border border-border bg-background p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-950/5", className)}>
      <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-900/20"><Icon name={icon} /></span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-muted-foreground text-pretty">{text}</p>
      {children && <div className="mt-6 flex flex-1 flex-col justify-end">{children}</div>}
    </li>
  );
}

/**
 * The public home page. The catalogue (certifications, vendors, languages)
 * is read from the database and the offers from the plan table, so the page
 * never states a figure the platform does not apply.
 */
export default async function HomePage() {
  const t = await getTranslations("home");
  const tSeo = await getTranslations("seo");
  const locale = await pageLocale();
  const tOffer = await getTranslations("offer");
  const tBilling = await getTranslations("billing");
  const format = await getFormatter();
  const session = await auth();
  const [certifications, { signupOpen }, offers, quota] = await Promise.all([
    prisma.certification.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
      select: {
        id: true, code: true, title: true, vendor: true, languages: true, format: true, freeAccess: true,
        blueprints: { where: { current: true }, take: 1, select: { durationMin: true, minQuestions: true, maxQuestions: true, passScore: true, maxScore: true, _count: { select: { domains: true } } } },
      },
    }),
    readSwitches(prisma),
    getOffers(prisma),
    freeExamQuota(prisma),
  ]);
  const blueprint = certifications.find((c) => c.blueprints[0])?.blueprints[0];
  const pass = offers.find((o) => o.kind === "pass");
  const pricing = pass ? await passPricing(prisma, pass.code, stripeApi()) : null;
  const buyable = (pricing?.buyable.length ?? 0) > 0;
  const money = (cents: number, currency: string) => format.number(cents / 100, { style: "currency", currency: currency.toUpperCase() });
  // The Pass is priced per certification: "from X" when the prices differ.
  const price = (o: Offer) => {
    const range = o.kind === "pass" ? pricing?.range : null;
    if (range && range.min !== range.max) return tOffer("priceFrom", { price: money(range.min, range.currency) });
    return range ? money(range.min, range.currency) : money(o.amountCents, o.currency);
  };
  const freeExams = quota === null ? null : t("freeExams", { count: quota });
  // The vendors of the certifications on offer: their documentation, their names.
  const groups = groupByVendor(certifications);
  const vendors = groups.map((g) => g.vendor);
  const docsNames = vendors.length ? joinNames(locale, vendors.map((v) => v.docsName)) : t("docsOfficial");
  const vendorNames = vendors.length ? joinNames(locale, vendors.map((v) => v.name)) : t("vendorFallback");
  // Some certifications are prepared in English only (no French exam): said once, under the catalogue.
  const englishOnly = certifications.some((c) => !c.languages.includes("fr"));
  // The practical exercises (kubectl commands, YAML manifests) only once a performance-based certification is on offer.
  const formats = FORMATS.filter((f) => !isExerciseType(f) || certifications.some((c) => isPerformance(c.format)));
  // One certification per vendor in the overview picture, then the others.
  const sampleCodes = [...new Set([...groups.map((g) => g.certifications[0]!.code), ...certifications.map((c) => c.code)])];

  // The main call to action, the same in every section that offers one.
  let primary = { href: "/login", label: t("cta") };
  if (session) primary = { href: "/dashboard", label: t("ctaDashboard") };
  else if (signupOpen) primary = { href: "/signup", label: t("ctaStart") };

  const stats = [
    [String(certifications.length), t("stats.certifications")],
    [String(vendors.length), t("stats.vendors", { count: vendors.length, names: vendorNames })],
    [String(formats.length), t("stats.formats")],
    ["FR · EN", t("stats.languages")],
  ] as const;

  return (
    <div className="overflow-x-clip">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData(locale, tSeo("siteDescription"))) }} />

      {/* Hero */}
      <section className="relative isolate">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_80%_0%,var(--color-blue-100),transparent),radial-gradient(40%_40%_at_0%_20%,var(--color-indigo-50),transparent)]" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,color-mix(in_srgb,var(--color-slate-200)_45%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,var(--color-slate-200)_45%,transparent)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-x-12 gap-y-20 px-4 pb-28 pt-14 sm:pt-20 lg:grid-cols-[1.15fr_1fr] lg:pb-32">
          <div>
            {certifications.length > 0 && (
              <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/70 px-3 py-1 text-sm font-medium text-blue-900 shadow-sm backdrop-blur">
                <span aria-hidden className="relative flex size-2">
                  <span className="absolute inline-flex size-full rounded-full bg-blue-400 opacity-75 motion-safe:animate-ping" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                {t("eyebrow", { count: certifications.length, vendors: vendorNames })}
              </p>
            )}
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {t("title")}
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground text-pretty">{t("subtitle")}</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              {session && <Link href="/dashboard" className={buttonClasses("primary", "px-5 py-3 text-base")}>{t("ctaDashboard")}<Icon name="arrow" className="size-4" /></Link>}
              {!session && signupOpen && (
                <>
                  <Link href="/signup" className={buttonClasses("primary", "px-5 py-3 text-base")}>{t("ctaSignup")}<Icon name="arrow" className="size-4" /></Link>
                  <Link href="/login" className={buttonClasses("secondary", "px-5 py-3 text-base")}>{t("cta")}</Link>
                </>
              )}
              {!session && !signupOpen && <Link href="/login" className={buttonClasses("primary", "px-5 py-3 text-base")}>{t("cta")}</Link>}
              {certifications.length > 0 && (
                <a href="#certifications" className={buttonClasses("ghost", "px-4 py-3 text-base text-muted-foreground hover:text-foreground")}>{t("ctaCatalog")}</a>
              )}
            </div>
            {!session && <p className="mt-4 text-sm text-muted-foreground">{signupOpen ? t("reassurance") : t("closed")}</p>}
          </div>
          {blueprint && <ExamPreview blueprint={{ ...blueprint, domains: blueprint._count.domains }} />}
        </div>
      </section>

      {/* The catalogue in figures */}
      {certifications.length > 0 && (
        <section aria-label={t("statsLabel")} className="border-y border-border bg-muted/50">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 lg:grid-cols-4">
            {stats.map(([value, label]) => (
              <div key={label} className="flex flex-col-reverse justify-end">
                <dt className="mt-1 text-sm text-muted-foreground text-pretty">{label}</dt>
                <dd className="bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent tabular-nums sm:text-4xl">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Features */}
      <section aria-labelledby="features" className="mx-auto max-w-6xl px-4 py-24">
        <SectionHeading id="features" eyebrow={t("featuresEyebrow")} title={t("featuresTitle")} subtitle={t("featuresSubtitle")} />
        <ul className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Feature icon="clock" title={t("features.exams")} text={t("features.examsText")} className="lg:col-span-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("formatsTitle")}</h4>
              <ul className="mt-3 flex flex-wrap gap-2">
                {formats.map((f) => (
                  <li key={f} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-900">{t(`formats.${f}`)}</li>
                ))}
              </ul>
            </div>
          </Feature>
          <Feature icon="chat" title={t("features.correction")} text={t("features.correctionText", { docsNames })}>
            <CorrectionPreview />
          </Feature>
          <Feature icon="book" title={t("features.course")} text={t("features.courseText")}>
            <CoursePreview />
          </Feature>
          <Feature icon="quiz" title={t("features.quiz")} text={t("features.quizText")}>
            <QuizPreview />
          </Feature>
          <Feature icon="gauge" title={t("features.readiness")} text={t("features.readinessText")}>
            <MasteryPreview />
          </Feature>
          <Feature icon="award" title={t("features.motivation")} text={t("features.motivationText")}>
            <XpPreview />
          </Feature>
          <Feature icon="stack" title={t("features.multi")} text={t("features.multiText")} className="md:col-span-2">
            {sampleCodes.length > 1 && <OverviewPreview codes={sampleCodes} />}
          </Feature>
        </ul>
      </section>

      {/* The journey */}
      <section aria-labelledby="steps" className="relative isolate overflow-hidden bg-slate-950 text-slate-100">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(50%_60%_at_50%_0%,color-mix(in_srgb,var(--color-blue-600)_35%,transparent),transparent)]" />
        <div className="mx-auto max-w-6xl px-4 py-24">
          <SectionHeading id="steps" eyebrow={t("stepsEyebrow")} title={t("stepsTitle")} dark />
          <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ key, icon }, i) => (
              <li key={key} className="relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/30"><Icon name={icon} /></span>
                  <span aria-hidden className="font-mono text-3xl font-bold text-white/15">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">{t(`steps.${key}`)}</h3>
                <p className="mt-2 text-slate-300 text-pretty">{t(`steps.${key}Text`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Catalogue */}
      {certifications.length > 0 && (
        <section id="certifications" aria-labelledby="catalog" className="scroll-mt-20 border-b border-border bg-muted/50">
          <div className="mx-auto max-w-6xl px-4 py-24">
            <SectionHeading id="catalog" eyebrow={t("catalogEyebrow")} title={t("catalogTitle", { count: certifications.length })} subtitle={t("catalogSubtitle", { vendors: vendorNames })} />
            {/* Grouped by vendor, with a filter, once several vendors are on offer: named, never a logo. */}
            <VendorGroups
              className="mt-12"
              groups={groups.map((g) => ({
                key: g.vendor.key,
                name: g.vendor.name,
                content: (
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {g.certifications.map((c) => (
                      <li key={c.id} className="flex items-start gap-3 rounded-xl border border-border bg-background p-4 shadow-sm">
                        <span className="shrink-0 rounded-md bg-blue-50 px-2 py-1 font-mono text-xs font-bold text-blue-800 ring-1 ring-blue-200">{c.code.toUpperCase()}</span>
                        <span className="min-w-0 text-sm font-medium leading-snug">
                          {c.title}
                          {c.freeAccess && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">{t("freeCertification")}</span>}
                          <EnglishOnlyBadge languages={c.languages} />
                          <PerformanceBadge format={c.format} />
                        </span>
                      </li>
                    ))}
                  </ul>
                ),
              }))}
            />
            {englishOnly && <p className="mx-auto mt-8 flex max-w-2xl items-start justify-center gap-2 text-center text-sm text-muted-foreground">
              <Icon name="globe" className="mt-0.5 size-4 shrink-0" />{t("catalogEnglish")}
            </p>}
          </div>
        </section>
      )}

      {/* Pricing */}
      <section aria-labelledby="pricing" className="mx-auto max-w-6xl px-4 py-24">
        <SectionHeading id="pricing" eyebrow={t("pricingEyebrow")} title={t("pricingTitle")} subtitle={t("pricingSubtitle")} />
        <ul className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          <li className="flex flex-col rounded-3xl border border-border bg-background p-8 shadow-sm">
            <h3 className="text-lg font-semibold">{t("free")}</h3>
            <p className="mt-4 text-5xl font-extrabold tracking-tight">{format.number(0, { style: "currency", currency: (offers[0]?.currency ?? "eur").toUpperCase(), maximumFractionDigits: 0 })}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("freeTerms")}</p>
            <ul className="mt-8 space-y-3 text-sm">
              {[freeExams, t("freeCorrection"), t("freeCourse"), t("freeProgress")].filter(Boolean).map((b) => (
                <li key={b} className="flex gap-3"><Icon name="check" className="size-5 shrink-0 text-success" />{b}</li>
              ))}
            </ul>
            <div className="mt-auto pt-8">
              <Link href={primary.href} className={buttonClasses("secondary", "w-full py-2.5")}>{primary.label}</Link>
            </div>
          </li>
          {pass && (
            <li className="relative flex flex-col rounded-3xl bg-gradient-to-b from-blue-600 to-indigo-700 p-px shadow-xl shadow-blue-900/20">
              <div className="flex flex-1 flex-col rounded-[calc(1.5rem-1px)] bg-background p-8">
                <span className="absolute -top-3 left-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-0.5 text-xs font-semibold text-white shadow-sm">{t("popular")}</span>
                <h3 className="text-lg font-semibold">{tOffer("name_pass")}</h3>
                <p className="mt-4 text-5xl font-extrabold tracking-tight tabular-nums">{price(pass)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tOffer("termsPass", { tax: tOffer(taxLabelKey(pass.taxBehavior)), days: pass.durationDays ?? 0 })}
                </p>
                <ul className="mt-8 space-y-3 text-sm">
                  {(["benefitExams", "benefitCorrection", "benefitCourse", "benefitProgress"] as const).map((k) => (
                    <li key={k} className="flex gap-3"><Icon name="check" className="size-5 shrink-0 text-primary" />{tOffer(k, { format: "other" })}</li>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  {buyable ? (
                    <Link href={localizedPath(locale, "/pricing")} className={buttonClasses("primary", "w-full py-2.5")}>{tBilling("buy")}</Link>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground">{t("soonHint")}</p>
                  )}
                  <p className="mt-3 text-center text-xs text-muted-foreground">{t("cartHint")}</p>
                </div>
              </div>
            </li>
          )}
        </ul>
        <p className="mt-8 text-center">
          <Link href={localizedPath(locale, "/pricing")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            {t("pricingMore")}<Icon name="arrow" className="size-4" />
          </Link>
        </p>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="border-t border-border bg-muted/50">
        <div className="mx-auto max-w-3xl px-4 py-24">
          <h2 id="faq" className="text-center text-3xl font-bold tracking-tight sm:text-4xl">{t("faqTitle")}</h2>
          <div className="mt-12 space-y-3">
            {FAQ.map((q) => (
              <details key={q} className="group rounded-2xl border border-border bg-background px-6 py-5 shadow-sm open:shadow-md [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {t(`faq.${q}Q`)}
                  <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-lg leading-none text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-muted-foreground text-pretty">{t(`faq.${q}A`, { exams: freeExams ?? "", vendors: vendorNames })}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final call to action */}
      <section className="mx-auto max-w-6xl px-4 pb-8 pt-24">
        <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-6 py-16 text-center text-white shadow-2xl shadow-blue-900/25 sm:px-12">
          <div aria-hidden className="absolute -right-20 -top-24 -z-10 size-80 rounded-full bg-white/10 blur-2xl" />
          <div aria-hidden className="absolute -bottom-28 -left-16 -z-10 size-72 rounded-full bg-indigo-400/30 blur-2xl" />
          <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">{t("finalTitle")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-blue-100 text-pretty">{t("finalText")}</p>
          <Link href={primary.href} className={cn(buttonClasses("secondary", "mt-9 border-transparent px-6 py-3 text-base text-primary shadow-lg"), "hover:bg-blue-50")}>
            {primary.label}<Icon name="arrow" className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
