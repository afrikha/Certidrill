import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { serverLocale } from "./server-intl";

const { setLocale } = vi.hoisted(() => ({ setLocale: vi.fn<(fd: FormData) => Promise<void>>(async () => undefined) }));
vi.mock("@/lib/actions/locale", () => ({ setLocale }));
const page = vi.hoisted(() => ({ current: null as { locale: "en" | "fr"; path: "/" | "/pricing" } | null }));
vi.mock("@/lib/i18n/public-page", () => ({ currentPublicPage: async () => page.current }));
vi.mock("next-intl/server", async () => {
  const m = await import("./server-intl");
  return { getTranslations: m.getTranslationsMock, getLocale: async () => m.serverLocale.current };
});

import { LocaleSwitcher } from "@/components/locale-switcher";

beforeEach(() => {
  setLocale.mockClear();
  serverLocale.current = "en";
  page.current = null;
});

describe("LocaleSwitcher", () => {
  it("renders one toggle button per locale, the current one pressed (EN)", async () => {
    render(await LocaleSwitcher());
    expect(screen.getByRole("form", { name: "Language" })).toBeInTheDocument();
    const en = screen.getByRole("button", { name: "en" });
    const fr = screen.getByRole("button", { name: "fr" });
    expect(en).toHaveAttribute("aria-pressed", "true");
    expect(fr).toHaveAttribute("aria-pressed", "false");
    expect(fr).toHaveAttribute("lang", "fr");
    expect(en).toHaveClass("bg-foreground");
    expect(fr).toHaveClass("text-muted-foreground");
  });

  it("labels the form in French and presses FR", async () => {
    serverLocale.current = "fr";
    render(await LocaleSwitcher());
    expect(screen.getByRole("form", { name: "Langue" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "fr" })).toHaveAttribute("aria-pressed", "true");
  });

  it("submits the chosen locale to the setLocale server action", async () => {
    render(await LocaleSwitcher());
    await userEvent.click(screen.getByRole("button", { name: "fr" }));
    await vi.waitFor(() => expect(setLocale).toHaveBeenCalledOnce());
    const data = setLocale.mock.calls[0]![0] as FormData;
    expect(data.get("locale")).toBe("fr");
    expect(data.has("path")).toBe(false);
  });

  it("on a public page, also sends the page so the action opens it in the chosen language", async () => {
    page.current = { locale: "en", path: "/pricing" };
    render(await LocaleSwitcher());
    await userEvent.click(screen.getByRole("button", { name: "fr" }));
    await vi.waitFor(() => expect(setLocale).toHaveBeenCalledOnce());
    const data = setLocale.mock.calls[0]![0] as FormData;
    expect([data.get("locale"), data.get("path")]).toEqual(["fr", "/pricing"]);
  });
});
