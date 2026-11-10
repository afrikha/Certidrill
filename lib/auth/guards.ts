import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Server components: returns the signed-in user or redirects to /login. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
