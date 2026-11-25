import { notFound, redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getAttemptView, SessionError } from "@/lib/exam/session";
import { ExamClient } from "@/components/exam/exam-client";
import { EnglishOnlyNotice } from "@/components/english-only";

export const metadata = { title: "Exam" };
export const dynamic = "force-dynamic";

export default async function ExamPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const user = await requireUser();
  let view;
  try {
    view = await getAttemptView(prisma, { attemptId: id, userId: user.id });
  } catch (err) {
    if (err instanceof SessionError && err.code === "not_found") notFound();
    throw err;
  }
  if (view.status === "submitted" || view.status === "expired") redirect(`/results/${id}`);
  // The exam is shown in its own language (chosen at creation), whatever the interface language.
  const messages = (await import(`../../../../messages/${view.locale}.json`)).default;
  return (
    <NextIntlClientProvider locale={view.locale} messages={messages}>
      <div lang={view.locale}>
        <EnglishOnlyNotice languages={view.certification.languages} locale={view.locale} className="mx-auto mt-2 max-w-5xl rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground" />
        <ExamClient initial={view} resumed={view.status === "in_progress"} />
      </div>
    </NextIntlClientProvider>
  );
}
