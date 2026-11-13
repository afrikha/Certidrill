"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, VERIFY_REQUEST_URL } from "@/auth";
import { headers } from "next/headers";
import { formString } from "@/lib/form-data";
import { prisma } from "@/lib/db";
import { signUp } from "@/lib/auth/signup";
import { clientIp, signupLimiter } from "@/lib/security/rate-limit";
import { logError } from "@/lib/log";

export type LoginState = { error?: "invalid" | "rateLimited" | "error"; email?: string } | undefined;

export async function loginWithPassword(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = formString(formData, "email");
  try {
    await signIn("credentials", {
      email,
      password: formString(formData, "password"),
      redirectTo: "/dashboard",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      if (err.type === "CredentialsSignin") {
        return { email, error: (err as AuthError & { code?: string }).code === "rate_limited" ? "rateLimited" : "invalid" };
      }
      return { email, error: "error" };
    }
    throw err; // NEXT_REDIRECT
  }
}

export async function loginWithMagicLink(formData: FormData) {
  try {
    await signIn("email", { email: formString(formData, "email").toLowerCase().trim(), redirectTo: "/dashboard" });
  } catch (err) {
    if (err instanceof AuthError) redirect(VERIFY_REQUEST_URL);
    throw err;
  }
}

export type SignupState = { sent?: true; error?: "closed" | "invalid" | "rateLimited" | "mismatch" | "error"; email?: string } | undefined;

/** Public sign-up (lib/auth/signup.ts): the account is created when the e-mailed link is followed. */
export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const email = formString(formData, "email");
  const password = formString(formData, "password");
  if (password !== formString(formData, "confirm")) return { email, error: "mismatch" };
  try {
    const result = await signUp(prisma, signupLimiter, { email, password, locale: formString(formData, "locale") }, { ip: clientIp(await headers()) });
    if (result === "sent") return { sent: true, email };
    return { email, error: result === "rate_limited" ? "rateLimited" : result };
  } catch (err) {
    // SMTP down: the request is kept, signing up again sends a new link.
    logError("signup.error", err);
    return { email, error: "error" };
  }
}
