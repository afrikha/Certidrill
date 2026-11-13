import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { serverLocale } from "./server-intl";

const { auth, signOut } = vi.hoisted(() => ({ auth: vi.fn(), signOut: vi.fn(async () => undefined) }));
vi.mock("@/auth", () => ({ auth, signOut }));
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
  serverLocale.current = "en";
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
  it("shows the disclaimer", async () => {
    render(await SiteFooter());
    expect(screen.getByRole("contentinfo")).toHaveTextContent(/not affiliated with/);
  });

  it("shows the French disclaimer", async () => {
    serverLocale.current = "fr";
    render(await SiteFooter());
    expect(screen.getByRole("contentinfo")).toHaveTextContent(/non affilié à Microsoft/);
  });
});
