"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, VERIFY_REQUEST_URL } from "@/auth";
import { formString } from "@/lib/form-data";

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
