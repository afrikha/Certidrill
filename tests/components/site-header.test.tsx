import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { serverLocale } from "./server-intl";

const { auth, signOut, hasVisibleCourse, active } = vi.hoisted(() => ({
  auth: vi.fn(),
  signOut: vi.fn(async () => undefined),
  hasVisibleCourse: vi.fn(async () => false),
  // The active certifications the footer reads (their vendors).
  active: { current: [{ code: "az-104", title: "Azure Administrator", vendor: "Microsoft", blueprints: [] }] as { code: string; title: string; vendor: string; blueprints: unknown[] }[] },
}));
vi.mock("@/auth", () => ({ auth, signOut }));
vi.mock("@/lib/db", () => ({ prisma: { certification: { findMany: async () => active.current } } }));
vi.mock("@/lib/course/read", () => ({ hasVisibleCourse }));
vi.mock("next-intl/server", async () => {
  const m = await import("./server-intl");
  return { getTranslations: m.getTranslationsMock, getLocale: async () => m.serverLocale.current };
});
// The real switcher is an async server component (tested on its own).
vi.mock("@/components/locale-switcher", () => ({ LocaleSwitcher: () => <div data-testid="locale-switcher" /> }));

import { SiteFooter, SiteHeader } from "@/components/site-header";

beforeEach(() => {
  auth.mockReset();
  signOut.mockClear();
  hasVisibleCourse.mockReset();
  hasVisibleCourse.mockResolvedValue(false);
  serverLocale.current = "en";
  active.current = [{ code: "az-104", title: "Azure Administrator", vendor: "Microsoft", blueprints: [] }];
});

describe("SiteHeader", () => {
  it("shows the sign-in link to visitors (EN)", async () => {
    auth.mockResolvedValue(null);
    render(await SiteHeader());
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Certi\s?drill$/ })).toHaveAttribute("href", "/en");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/en/pricing");
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.getByTestId("locale-switcher")).toBeInTheDocument();
  });

  it("shows the member links without admin for a regular user (FR)", async () => {
    serverLocale.current = "fr";
    auth.mockResolvedValue({ user: { id: "u", email: "a@b.c", role: "user", locale: "fr" } });
    render(await SiteHeader());
    expect(screen.getByRole("link", { name: "Tableau de bord" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Compte" })).toHaveAttribute("href", "/account");
    // The public pages are linked in the language being read.
    expect(screen.getByRole("link", { name: "Tarifs" })).toHaveAttribute("href", "/fr/pricing");
    expect(screen.getByRole("link", { name: /^Certi\s?drill$/ })).toHaveAttribute("href", "/fr");
    expect(screen.queryByRole("link", { name: "Administration" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Se déconnecter" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Se connecter" })).not.toBeInTheDocument();
    // No chapter open to this user yet: no course entry.
    expect(screen.queryByRole("link", { name: "Cours" })).not.toBeInTheDocument();
  });

  it("shows the course entry once a chapter is open to the user", async () => {
    auth.mockResolvedValue({ user: { id: "u", email: "a@b.c", role: "user", locale: "en" } });
    hasVisibleCourse.mockResolvedValue(true);
    render(await SiteHeader());
    expect(screen.getByRole("link", { name: "Course" })).toHaveAttribute("href", "/course");
    expect(hasVisibleCourse).toHaveBeenCalledWith(expect.anything(), { userId: "u", isAdmin: false });
  });

  it("shows the admin link to admins and signs out through the form action", async () => {
    auth.mockResolvedValue({ user: { id: "u", email: "a@b.c", role: "admin", locale: "en" } });
    render(await SiteHeader());
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin/users");
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await vi.waitFor(() => expect(signOut).toHaveBeenCalledWith({ redirectTo: "/" }));
  });
});

describe("SiteFooter", () => {
  it("shows the disclaimer of the Microsoft certifications, as before", async () => {
    render(await SiteFooter());
    expect(screen.getByTestId("disclaimer")).toHaveTextContent(
      "Certidrill is an independent website. It is not affiliated with, endorsed or sponsored by Microsoft. Microsoft and Azure are trademarks of the Microsoft group of companies. All questions are original and written from public documentation; none comes from a real exam.",
    );
  });

  it("shows the French disclaimer", async () => {
    serverLocale.current = "fr";
    render(await SiteFooter());
    expect(screen.getByTestId("disclaimer")).toHaveTextContent(
      "Certidrill est un site indépendant, non affilié à Microsoft ni approuvé ou parrainé par Microsoft. Microsoft et Azure sont des marques du groupe Microsoft. Toutes les questions sont originales et rédigées à partir de la documentation publique ; aucune ne provient d'un examen réel.",
    );
  });

  it("names the vendor of every active certification, and its trademarks", async () => {
    serverLocale.current = "fr";
    active.current = [...active.current, { code: "saa-c03", title: "Solutions Architect – Associate", vendor: "AWS", blueprints: [] }];
    render(await SiteFooter());
    const text = screen.getByTestId("disclaimer").textContent;
    expect(text).toContain("non affilié à Microsoft ou AWS");
    expect(text).toContain("Microsoft et Azure sont des marques du groupe Microsoft. AWS, Amazon Web Services et les noms de services AWS sont des marques d'Amazon.com, Inc. ou de ses filiales.");
  });

  it("names AWS alone when only AWS certifications are active, and no vendor without any", async () => {
    active.current = [{ code: "saa-c03", title: "Solutions Architect – Associate", vendor: "AWS", blueprints: [] }];
    render(await SiteFooter());
    expect(screen.getByTestId("disclaimer").textContent).toMatch(/sponsored by AWS\. AWS, Amazon Web Services .* affiliates\. All questions/);
    expect(screen.getByTestId("disclaimer").textContent).not.toContain("Microsoft");
    active.current = [];
    render(await SiteFooter());
    expect(screen.getAllByTestId("disclaimer")[1]).toHaveTextContent("Certidrill is an independent website. All questions are original and written from public documentation; none comes from a real exam.");
  });

  it("links to the privacy policy", async () => {
    render(await SiteFooter());
    expect(screen.getByRole("link", { name: "Privacy policy" })).toHaveAttribute("href", "/privacy");
  });

  it("links to the legal notice", async () => {
    render(await SiteFooter());
    expect(screen.getByRole("link", { name: "Legal notice" })).toHaveAttribute("href", "/legal");
  });
});
