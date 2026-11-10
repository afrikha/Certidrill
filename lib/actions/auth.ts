"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, VERIFY_REQUEST_URL } from "@/auth";

export type LoginState = { error?: "invalid" | "rateLimited" | "error"; email?: string } | undefined;

export async function loginWithPassword(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  try {
    await signIn("credentials", {
      email,
      password: String(formData.get("password") ?? ""),
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
    await signIn("email", { email: String(formData.get("email") ?? "").toLowerCase().trim(), redirectTo: "/dashboard" });
  } catch (err) {
    if (err instanceof AuthError) redirect(VERIFY_REQUEST_URL);
    throw err;
  }
}
