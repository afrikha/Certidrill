import { notFound, redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getAttemptView, SessionError } from "@/lib/exam/session";
import { ExamClient } from "@/components/exam/exam-client";

export const metadata = { title: "Exam" };
export const dynamic = "force-dynamic";

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
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
        <ExamClient initial={view} resumed={view.status === "in_progress"} />
      </div>
    </NextIntlClientProvider>
  );
}
