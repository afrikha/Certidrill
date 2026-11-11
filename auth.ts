import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { allowSignIn, authorizeCredentials, RateLimitedError, refreshToken, sessionUser } from "@/lib/auth/callbacks";
import { sendMagicLink } from "@/lib/auth/email";
import { authLimiter } from "@/lib/security/rate-limit";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: { id: string; email: string; name?: string | null; role: Role; locale: string };
  }
}

class RateLimited extends CredentialsSignin {
  code = "rate_limited";
}

export { VERIFY_REQUEST_URL } from "@/lib/auth/callbacks";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Credentials require JWT sessions; the JWT lives in an HttpOnly cookie.
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", verifyRequest: "/login", error: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        try {
          return await authorizeCredentials(prisma, authLimiter, raw, request);
        } catch (err) {
          if (err instanceof RateLimitedError) throw new RateLimited();
          throw err;
        }
      },
    }),
    {
      id: "email",
      type: "email",
      name: "Email",
      from: process.env.EMAIL_FROM ?? "Certidrill <no-reply@certidrill.com>",
      maxAge: 15 * 60,
      options: {},
      async sendVerificationRequest({ identifier, url }) {
        await sendMagicLink({ to: identifier, url });
      },
    },
  ],
  callbacks: {
    signIn: ({ user, account }) => allowSignIn(prisma, authLimiter, account?.provider, user.email),
    jwt: ({ token, user }) => refreshToken(prisma, token, user?.id),
    session({ session, token }) {
      session.user = { ...session.user, ...sessionUser(token) };
      return session;
    },
  },
});
