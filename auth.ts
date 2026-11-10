import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
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

export const VERIFY_REQUEST_URL = "/login?provider=email&type=email";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(256),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Credentials require JWT sessions; the JWT lives in an HttpOnly cookie.
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", verifyRequest: "/login", error: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
        if (!authLimiter.hit(`email:${email}`) || !authLimiter.hit(`ip:${ip}`)) throw new RateLimited();

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, password))) return null;
        authLimiter.reset(`email:${email}`);
        return { id: user.id, email: user.email, name: user.name };
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
    // Closed sign-ups (decision of 2026-11-11): accounts are created by an
    // administrator, a magic link is only sent to an existing account.
    async signIn({ user, account }) {
      if (account?.provider !== "email") return true;
      const email = user.email?.toLowerCase();
      if (!email) return false;
      if (!authLimiter.hit(`magic:${email}`)) return false;
      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      // Same redirect as a real send (Auth.js appends these parameters to
      // pages.verifyRequest), so the response does not reveal which addresses
      // have an account.
      return existing ? true : VERIFY_REQUEST_URL;
    },
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, locale: true, email: true, name: true },
        });
        if (!dbUser) return null;
        token.role = dbUser.role;
        token.locale = dbUser.locale;
        token.email = dbUser.email;
        token.name = dbUser.name;
      }
      return token;
    },
    session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.sub as string,
        email: token.email as string,
        name: (token.name as string | null | undefined) ?? null,
        role: (token.role as Role) ?? "user",
        locale: (token.locale as string) ?? "en",
      };
      return session;
    },
  },
});
