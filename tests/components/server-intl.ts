import { createTranslator } from "next-intl";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

/** Current locale used by the mocked `next-intl/server` in server-component tests. */
export const serverLocale = { current: "en" as "en" | "fr" };

/** Implementation of `getTranslations` backed by the real messages. */
export async function getTranslationsMock(namespace?: string) {
  const locale = serverLocale.current;
  return createTranslator({ locale, messages: locale === "en" ? en : fr, namespace: namespace as never });
}
