import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getTranslations("dashboard");
  const blueprints = await prisma.blueprint.findMany({
    where: { current: true, certification: { active: true } },
    include: { certification: true, domains: { include: { _count: { select: { objectives: true } } } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("welcome", { name: user.name ?? user.email })}</h1>
      {blueprints.map((b) => (
        <Card key={b.id}>
          <p className="text-sm text-muted-foreground">
            {t("referential", {
              code: b.certification.code.toUpperCase(),
              domains: b.domains.length,
              objectives: b.domains.reduce((n, d) => n + d._count.objectives, 0),
              duration: b.durationMin,
              pass: b.passScore,
              max: b.maxScore,
            })}
          </p>
          <div className="mt-4 flex items-center gap-4">
            <Button disabled>{t("newExam")}</Button>
            <span className="text-sm text-muted-foreground">{t("comingSoon")}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
