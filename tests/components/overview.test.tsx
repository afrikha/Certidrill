import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { OverviewCard } from "@/components/progress/overview-card";
import type { Overview } from "@/lib/progress/overview";
import { renderIntl } from "./render";

const overview: Overview = {
  rows: [
    { certification: "az-104", exams: 3, lastScore: 810, lastPassed: true, lastAt: "2026-11-04", passed: 2, readiness: { index: 82, verdict: "ready", ready: true }, level: { n: 3, title: "Practitioner", xp: 420 }, badges: 2, realPassed: false },
    { certification: "az-900", exams: 1, lastScore: 640, lastPassed: false, lastAt: "2026-11-02", passed: 0, readiness: null, level: null, badges: 0, realPassed: true },
  ],
  totals: { certifications: 2, exams: 4, passed: 2, ready: 1, xp: 420, badges: 2, realPassed: 1 },
};

describe("OverviewCard", () => {
  it("shows the totals and one line per certification, linking to its progress (FR)", () => {
    renderIntl(<OverviewCard overview={overview} selected="az-104" titles={{ "az-104": "Administrateur Azure", "az-900": "Notions fondamentales" }} />, "fr");
    expect(screen.getByRole("heading", { name: "Toutes mes certifications" })).toBeInTheDocument();
    const total = (key: string) => screen.getByText(key).parentElement!.querySelector("dd");
    expect(total("Examens blancs")).toHaveTextContent("4");
    expect(total("Certifications prêtes")).toHaveTextContent("1");
    expect(total("Examens réels réussis")).toHaveTextContent("1");
    const az104 = screen.getByRole("row", { name: /AZ-104/i });
    expect(within(az104).getByRole("link", { name: "az-104" })).toHaveAttribute("href", "/dashboard?certification=az-104");
    expect(within(az104).getByRole("link")).toHaveAttribute("aria-current", "true");
    expect(az104).toHaveTextContent("82 · Prêt");
    expect(az104).toHaveTextContent("3 · Practitioner");
    const az900 = screen.getByRole("row", { name: /AZ-900/i });
    expect(az900).toHaveTextContent("réussi");
    expect(within(az900).getAllByRole("cell").map((c) => c.textContent)).toEqual(["1", "640", "—", "—"]);
  });
});
