import { requireUser } from "@/lib/auth/guards";

/** Distraction-free layout for the exam itself: no site navigation. */
export default async function ExamLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return children;
}
