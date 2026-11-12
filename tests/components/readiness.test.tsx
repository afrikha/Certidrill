import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { ReadinessCard, ReadinessChange, ReadinessGauge } from "@/components/progress/readiness";
import type { Readiness } from "@/lib/progress/readiness";
import { renderIntl } from "./render";

const WEIGHTS = { level: 0.5, consistency: 0.2, domains: 0.2, freshness: 0.1 };
const BANDS = [50, 70, 85];

function readiness(over: Partial<Readiness> = {}): Readiness {
  return {
    index: 72,
    raw: 72,
    capped: false,
    verdict: "almost",
    ready: false,
    criteria: { level: 87, consistency: 76, domains: 16, freshness: 100 },
    checks: [
      { code: "attempts", blocking: true, ok: true, value: 3, target: 3 },
      { code: "streak", blocking: true, ok: false, value: 2, target: 3, min: 800 },
      { code: "weakest_domain", blocking: true, ok: false, value: 640, target: 650, domain: "networking" },
      { code: "index", blocking: true, ok: false, value: 72, target: 85, criterion: "domains" },
      { code: "average", blocking: false, ok: true, value: 817, target: 800 },
      { code: "new_questions", blocking: false, ok: false, value: 30, target: 50 },
      { code: "recent_exam", blocking: false, ok: true, value: 0, target: 30 },
    ],
    attempts: 3,
    streak: 2,
    needed: 3,
    minScore: 800,
    ...over,
  };
}

describe("ReadinessCard", () => {
  it("shows the index, the verdict and what is missing (EN)", () => {
    renderIntl(<ReadinessCard readiness={readiness()} bands={BANDS} weights={WEIGHTS} domainTitles={{ networking: "Virtual networking" }} />);
    const card = screen.getByRole("region", { name: "Readiness for the real exam" });
    expect(card).toHaveAttribute("data-verdict", "almost");
    expect(screen.getByTestId("readiness-index")).toHaveTextContent("72 / 100");
    expect(screen.getByTestId("readiness-verdict")).toHaveTextContent("Almost ready");
    expect(within(card).getByText(/Nearly there/)).toBeInTheDocument();
    expect(screen.queryByTestId("readiness-capped")).toBeNull();

    const rules = within(card).getByRole("heading", { name: "Required to be ready" }).nextElementSibling as HTMLElement;
    expect(within(rules).getAllByRole("listitem")).toHaveLength(4);
    expect(rules.querySelector('[data-check="attempts"]')).toHaveTextContent("Met: 3 exams taken (at least 3)");
    expect(rules.querySelector('[data-check="streak"]')).toHaveTextContent("Not met: 2 of 3 consecutive exams at 800 or more");
    expect(rules.querySelector('[data-check="weakest_domain"]')).toHaveTextContent("Virtual networking at 640, under 650: that is your weak point");
    expect(rules.querySelector('[data-check="index"]')).toHaveTextContent("Your scores give 72 / 100, 85 needed: the criterion costing you the most points is “Weakest domain”");

    expect(card.querySelector('[data-check="average"]')).toHaveTextContent("Average of your recent exams: 817 (target 800)");
    expect(card.querySelector('[data-check="new_questions"]')).toHaveTextContent("30 % (under 50 %)");
    expect(card.querySelector('[data-check="recent_exam"]')).toHaveTextContent("Last exam today");

    // How the index is computed: weights and points per criterion.
    const table = within(card).getByRole("table");
    expect(within(table).getByRole("row", { name: /Weakest domain/ })).toHaveTextContent("20 %16 / 100");
    expect(within(card).getByText(/not a guarantee/)).toBeInTheDocument();
  });

  it("says when a failing condition holds the index under ready", () => {
    renderIntl(<ReadinessCard readiness={readiness({ index: 84, raw: 100, capped: true })} bands={BANDS} weights={WEIGHTS} domainTitles={{}} />);
    expect(screen.getByTestId("readiness-capped")).toHaveTextContent("Your scores give 100: the index stays under “Ready” until every condition is met.");
  });

  it("falls back to the domain code and speaks French", () => {
    renderIntl(<ReadinessCard readiness={readiness({ index: 92, verdict: "ready", ready: true, checks: [{ code: "weakest_domain", blocking: true, ok: true, value: 700, target: 650, domain: "networking" }, { code: "index", blocking: true, ok: true, value: 92, target: 85, criterion: "freshness" }, { code: "recent_exam", blocking: false, ok: false, value: 45, target: 30 }] })} bands={BANDS} weights={WEIGHTS} domainTitles={{}} />, "fr");
    expect(screen.getByTestId("readiness-verdict")).toHaveTextContent("Prêt");
    expect(screen.getByText(/Domaine le plus faible : networking à 700/)).toBeInTheDocument();
    expect(screen.getByText(/Dernier examen il y a 45 jours/)).toBeInTheDocument();
    expect(screen.getByText("Vos scores atteignent le palier « Prêt » (85 / 100)")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Préparation à la vraie certification" })).toHaveClass("border-success");
  });
});

describe("ReadinessGauge", () => {
  it("fills the arc up to the index, with a mark per band", () => {
    const { container } = renderIntl(<ReadinessGauge index={40} verdict="not_ready" marks={BANDS} />);
    const paths = container.querySelectorAll("path");
    expect(paths).toHaveLength(2);
    expect(paths[1]).toHaveAttribute("stroke-dasharray", "40 100");
    expect(paths[1]).toHaveClass("stroke-danger");
    expect(container.querySelectorAll("line")).toHaveLength(3);
  });

  it("draws no value arc at 0", () => {
    const { container } = renderIntl(<ReadinessGauge index={0} verdict="not_ready" marks={[]} />);
    expect(container.querySelectorAll("path")).toHaveLength(1);
  });
});

describe("ReadinessChange", () => {
  it("shows a first measure", () => {
    renderIntl(<ReadinessChange before={null} after={readiness({ index: 40, verdict: "not_ready" })} />);
    expect(screen.getByTestId("readiness-delta")).toHaveTextContent("First measure");
    expect(screen.getByRole("link", { name: /See what is missing/ })).toHaveAttribute("href", "/dashboard");
  });

  it("shows a rise and a new stage", () => {
    renderIntl(<ReadinessChange before={readiness({ index: 64, verdict: "progressing" })} after={readiness({ index: 72, verdict: "almost" })} />);
    expect(screen.getByTestId("readiness-delta")).toHaveTextContent("+8 since your previous exam");
    expect(screen.getByText("New stage reached: Almost ready!")).toBeInTheDocument();
  });

  it("shows a fall or no change, without a new stage (FR)", () => {
    const { unmount } = renderIntl(<ReadinessChange before={readiness({ index: 80 })} after={readiness({ index: 75 })} />, "fr");
    expect(screen.getByTestId("readiness-delta")).toHaveTextContent("−5 depuis votre examen précédent");
    expect(screen.queryByText(/Nouveau palier/)).toBeNull();
    unmount();
    renderIntl(<ReadinessChange before={readiness()} after={readiness()} />, "fr");
    expect(screen.getByTestId("readiness-delta")).toHaveTextContent("Inchangé");
  });
});
