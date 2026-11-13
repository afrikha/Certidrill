"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isLocale } from "@/lib/i18n/config";
import { LOCALE_COOKIE, localeCookieOptions } from "@/lib/i18n/cookie";
import { isPublicPath, localizedPath } from "@/lib/i18n/routing";

/**
 * Saves the chosen language (cookie, and the account when signed in). On a
 * public page, whose address carries its language, it then opens the same page
 * in the chosen language; `path` is checked against the public pages.
 */
export async function setLocale(formData: FormData) {
  const locale = formData.get("locale");
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, localeCookieOptions({ chosen: true }));
  const session = await auth();
  if (session?.user?.id) await prisma.user.update({ where: { id: session.user.id }, data: { locale } });
  revalidatePath("/", "layout");
  const path = formData.get("path");
  if (isPublicPath(path)) redirect(localizedPath(locale, path));
}
