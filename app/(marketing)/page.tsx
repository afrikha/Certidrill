import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const t = await getTranslations("home");
  const session = await auth();
  const certifications = await prisma.certification.findMany({ where: { active: true }, orderBy: { code: "asc" } });
  const features = ["realistic", "variety", "report", "progress"] as const;

  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="py-16">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t("subtitle")}</p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link href={session ? "/dashboard" : "/login"} className={buttonClasses("primary")}>
            {session ? t("ctaDashboard") : t("cta")}
          </Link>
          {!session && <p className="text-sm text-muted-foreground">{t("closed")}</p>}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <Card key={f}><p>{t(`features.${f}`)}</p></Card>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">{t("available")}</h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {certifications.map((c) => (
            <li key={c.id} className="rounded-md border border-border px-4 py-2">
              <span className="font-mono text-sm font-semibold uppercase">{c.code}</span> — {c.title}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
