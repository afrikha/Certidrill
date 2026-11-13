import { requireUser } from "@/lib/auth/guards";

/** Behind sign-in: kept out of search results. */
export { NO_INDEX as metadata } from "@/lib/seo";

/** Distraction-free layout for the exam itself: no site navigation. */
export default async function ExamLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return children;
}
