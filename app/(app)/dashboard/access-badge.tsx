import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import type { AccessLevel, AccessSource } from "@/lib/access";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;

/** The access level on a certification: full (and until when), or free with the mock exams left. */
export function AccessBadge({ access, certification, now = new Date() }: Readonly<{
  access: { level: AccessLevel; source: AccessSource; expiresAt: string | null; examsLeft: number | null };
  certification: string;
  now?: Date;
}>) {
  const t = useTranslations("access");
  const format = useFormatter();
  const full = access.level === "full";
  let text: string;
  if (!full) text = access.examsLeft === null ? t("freeUnlimited") : t("free", { n: access.examsLeft });
  else if (access.source === "pass" && access.expiresAt) {
    const end = new Date(access.expiresAt);
    text = t("pass", { days: Math.max(1, Math.ceil((end.getTime() - now.getTime()) / DAY_MS)), date: format.dateTime(end, { dateStyle: "long" }) });
  } else text = t(`full_${access.source}`);
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 text-sm" data-testid="access" data-level={access.level}>
      <span className={cn("rounded-full px-3 py-0.5 font-semibold", full ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>{t(full ? "levelFull" : "levelFree")}</span>
      <span>{text}</span>
      {!full && (
        <Link href={`/offer?${new URLSearchParams({ reason: access.examsLeft === 0 ? "quota_exhausted" : "correction", certification })}`} className="text-primary underline">
          {t("seeFull")}
        </Link>
      )}
    </div>
  );
}
