import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { AccessBadge } from "@/app/(app)/dashboard/access-badge";
import { renderIntl } from "./render";

const NOW = new Date("2026-11-13T12:00:00Z");
const free = (examsLeft: number | null) => ({ level: "free" as const, source: "none" as const, expiresAt: null, examsLeft });

describe("AccessBadge", () => {
  it("shows the free exams left and links to the full access", () => {
    renderIntl(<AccessBadge access={free(1)} certification="az-104" now={NOW} />);
    const badge = screen.getByTestId("access");
    expect(badge).toHaveAttribute("data-level", "free");
    expect(badge).toHaveTextContent("Free access1 free full mock exam leftSee full access");
    expect(screen.getByRole("link", { name: "See full access" })).toHaveAttribute("href", "/offer?reason=correction&certification=az-104");
  });

  it("points to the offer screen once the free exam is used (FR)", () => {
    renderIntl(<AccessBadge access={free(0)} certification="az-104" now={NOW} />, "fr");
    expect(screen.getByTestId("access")).toHaveTextContent("Accès gratuitExamen blanc gratuit utilisé");
    expect(screen.getByRole("link", { name: "Voir l'accès complet" })).toHaveAttribute("href", "/offer?reason=quota_exhausted&certification=az-104");
  });

  it("counts the days left of a Pass", () => {
    renderIntl(<AccessBadge access={{ level: "full", source: "pass", expiresAt: "2026-12-01T09:00:00Z", examsLeft: null }} certification="az-104" now={NOW} />);
    expect(screen.getByTestId("access")).toHaveTextContent("Full accessPass: 18 days left (until December 1, 2026)");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("names the source of other full accesses, and an unlimited free level", () => {
    const { unmount } = renderIntl(<AccessBadge access={{ level: "full", source: "admin", expiresAt: null, examsLeft: null }} certification="az-104" now={NOW} />);
    expect(screen.getByTestId("access")).toHaveTextContent("Full accessAdministrator");
    unmount();
    renderIntl(<AccessBadge access={free(null)} certification="az-104" now={NOW} />);
    expect(screen.getByTestId("access")).toHaveTextContent("Free accessFree mock exams");
  });
});
