import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { confirmSignup } from "@/lib/auth/signup";

export const dynamic = "force-dynamic";

/**
 * The link of the sign-up e-mail: creates the account (lib/auth/signup.ts),
 * then sends to the login page. A link opened by a mail scanner before the
 * user does it no harm: the account gets the password chosen at sign-up.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const result = await confirmSignup(prisma, token);
  const target =
    result.status === "verified" ? "/login?verified=1" : result.status === "exists" ? "/login?verified=exists" : `/signup?verify=${result.status}`;
  // On the public address: behind the proxy, request.url carries the internal host.
  const response = NextResponse.redirect(new URL(target, process.env.AUTH_URL ?? request.url), 303);
  // The token is in this URL: it must not leak to other sites nor stay in a cache.
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
