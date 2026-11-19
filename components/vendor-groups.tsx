"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface VendorGroup {
  key: string;
  /** The vendor, named as text: never a logo nor a badge. */
  name: string;
  content: ReactNode;
}

/**
 * Certifications grouped by vendor. With one vendor, the content alone, as
 * before; with several, a heading per vendor and a filter to show one of them.
 * Every group is in the page (hidden ones too): search engines and readers
 * without script see the whole catalogue.
 */
export function VendorGroups({ groups, headingLevel = 3, className }: Readonly<{ groups: readonly VendorGroup[]; headingLevel?: 2 | 3; className?: string }>) {
  const t = useTranslations("vendors");
  const [shown, setShown] = useState<string | null>(null);
  if (groups.length === 0) return null;
  if (groups.length === 1) return <div className={className}>{groups[0]!.content}</div>;
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const choices = [{ key: null, name: t("filterAll") }, ...groups.map((g) => ({ key: g.key, name: g.name }))];
  return (
    <div className={cn("space-y-6", className)} data-testid="vendor-groups">
      <div role="group" aria-label={t("filterLabel")} className="flex flex-wrap justify-center gap-2">
        {choices.map((c) => (
          <button
            key={c.key ?? "all"}
            type="button"
            aria-pressed={shown === c.key}
            onClick={() => setShown(c.key)}
            className={cn("rounded-full border px-3 py-1 text-sm", shown === c.key ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted")}
          >
            {c.name}
          </button>
        ))}
      </div>
      {groups.map((g) => (
        <section key={g.key} hidden={shown !== null && shown !== g.key} data-vendor={g.key} aria-labelledby={`vendor-${g.key}`} className="space-y-3">
          <Heading id={`vendor-${g.key}`} className="text-base font-semibold">{g.name}</Heading>
          {g.content}
        </section>
      ))}
    </div>
  );
}
