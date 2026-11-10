import { getLocale, getTranslations } from "next-intl/server";
import { setLocale } from "@/lib/actions/locale";
import { locales } from "@/lib/i18n/config";

export async function LocaleSwitcher() {
  const current = await getLocale();
  const t = await getTranslations("common");
  return (
    <form action={setLocale} className="flex items-center gap-1" aria-label={t("language")}>
      {locales.map((l) => (
        <button
          key={l}
          name="locale"
          value={l}
          type="submit"
          aria-pressed={l === current}
          lang={l}
          className={
            "rounded px-2 py-1 text-xs font-semibold uppercase " +
            (l === current ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted")
          }
        >
          {l}
        </button>
      ))}
    </form>
  );
}
