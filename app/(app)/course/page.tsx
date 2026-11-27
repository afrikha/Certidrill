import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { coursesFor } from "@/lib/course/read";
import { Card } from "@/components/ui/card";
import { VendorGroups } from "@/components/vendor-groups";
import { groupByVendor } from "@/lib/vendors";
import { PerformanceBadge } from "@/components/performance";
import { EnglishOnlyBadge } from "@/components/english-only";

export const metadata = { title: "Course" };
export const dynamic = "force-dynamic";

/** The "Course" entry of the menu: the only course straight away, else the list. */
export default async function CoursesPage() {
  const user = await requireUser();
  const t = await getTranslations("course");
  const courses = await coursesFor(prisma, { userId: user.id, isAdmin: user.role === "admin" });
  if (courses.length === 1) redirect(`/course/${courses[0]!.code}`);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("chooseTitle")}</h1>
      {courses.length === 0 && <p className="text-muted-foreground">{t("none")}</p>}
      {/* Grouped by vendor, with a filter, once there are several. */}
      <VendorGroups
        headingLevel={2}
        groups={groupByVendor(courses).map((g) => ({
          key: g.vendor.key,
          name: g.vendor.name,
          content: (
            <ul className="grid gap-4 sm:grid-cols-2">
              {g.certifications.map((c) => (
                <li key={c.code}>
                  <Card>
                    <Link href={`/course/${c.code}`} className="font-semibold text-primary underline">{t("title", { code: c.code.toUpperCase() })}</Link>
                    <p className="mt-1 text-sm text-muted-foreground">{c.title}<EnglishOnlyBadge languages={c.languages} /><PerformanceBadge format={c.format} /></p>
                  </Card>
                </li>
              ))}
            </ul>
          ),
        }))}
      />
    </div>
  );
}
