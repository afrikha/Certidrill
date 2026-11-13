import { requireUser } from "@/lib/auth/guards";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { NO_INDEX } from "@/lib/seo";

/** Behind sign-in: kept out of search results. */
export const metadata = NO_INDEX;

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
