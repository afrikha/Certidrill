import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

/** Renders a component inside the next-intl provider, with the real messages. */
export function renderIntl(ui: ReactElement, locale: "en" | "fr" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : fr} timeZone="Europe/Paris">
      {ui}
    </NextIntlClientProvider>,
  );
}
