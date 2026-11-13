import { requireUser } from "@/lib/auth/guards";
import { SiteFooter, SiteHeader } from "@/components/site-header";

/** Behind sign-in: kept out of search results. */
export { NO_INDEX as metadata } from "@/lib/seo";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireUser();
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <SiteFooter />
    </>
  );
}
