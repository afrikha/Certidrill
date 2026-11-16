"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { CourseError, setSectionRead } from "@/lib/course/read";
import { isChapterStatus, setChapterStatus } from "@/lib/course/admin";
import { formString } from "@/lib/form-data";
import { courseReadLimiter } from "@/lib/security/rate-limit";

export type SectionReadState = { read: boolean; error?: "rate_limited" | "not_found" | "locked" };

/**
 * "Mark as read" (or unread) on a section of the course: reversible, limited
 * per user, and only on a section of a chapter the user may open and read.
 */
export async function setSectionReadAction(prev: SectionReadState, formData: FormData): Promise<SectionReadState> {
  const user = await requireUser();
  const read = formString(formData, "read") === "true";
  if (!courseReadLimiter.hit(user.id)) return { read: prev.read, error: "rate_limited" };
  try {
    const at = await setSectionRead(prisma, { viewer: { userId: user.id, isAdmin: user.role === "admin" }, sectionId: formString(formData, "section"), read });
    revalidatePath(`/course/${at.certification}`, "layout");
    revalidatePath("/dashboard");
  } catch (err) {
    if (err instanceof CourseError) return { read: prev.read, error: err.code };
    throw err;
  }
  return { read };
}

/** Back-office: changes the status of a chapter (recorded in the audit log). Readers see a published chapter at once. */
export async function setChapterStatusAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const status = formString(formData, "status");
  if (!isChapterStatus(status)) return;
  const changed = await setChapterStatus(prisma, admin.id, formString(formData, "chapter"), status);
  if (!changed) return;
  revalidatePath("/admin/course", "layout");
  revalidatePath("/course", "layout");
  revalidatePath("/dashboard");
}
