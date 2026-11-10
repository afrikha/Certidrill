"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isLocale } from "@/lib/i18n/config";
import { LOCALE_COOKIE } from "@/i18n/request";

export async function setLocale(formData: FormData) {
  const locale = formData.get("locale");
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  const session = await auth();
  if (session?.user?.id) await prisma.user.update({ where: { id: session.user.id }, data: { locale } });
  revalidatePath("/", "layout");
}
