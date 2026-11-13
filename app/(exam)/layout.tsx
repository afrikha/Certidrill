import { requireUser } from "@/lib/auth/guards";
import { NO_INDEX } from "@/lib/seo";

/** Behind sign-in: kept out of search results. */
export const metadata = NO_INDEX;

/** Distraction-free layout for the exam itself: no site navigation. */
export default async function ExamLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return children;
}
