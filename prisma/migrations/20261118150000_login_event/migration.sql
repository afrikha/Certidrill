-- Sign-ins and security events of an account, with the full IP address.
-- Kept one year (purged by the worker), deleted with the account.
CREATE TYPE "LoginKind" AS ENUM ('password', 'magic_link', 'failed', 'blocked', 'password_changed');

CREATE TABLE "login_event" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "LoginKind" NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "login_event_userId_createdAt_idx" ON "login_event"("userId", "createdAt");
CREATE INDEX "login_event_createdAt_idx" ON "login_event"("createdAt");

ALTER TABLE "login_event" ADD CONSTRAINT "login_event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
