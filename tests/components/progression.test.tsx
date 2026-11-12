import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { ProgressionCard, XpGainCard } from "@/components/progress/progression";
import type { XpGain } from "@/lib/progress/progression";
import { PROGRESSION } from "../unit/fixtures/bank";
import { renderIntl } from "./render";

const day = new Date(Date.UTC(2026, 0, 5, 12));

function progression(over: Partial<Parameters<typeof ProgressionCard>[0]["progression"]> = {}) {
  return {
    xp: 900,
    level: { n: 4, from: 750, next: 1200 },
    levels: 10,
    title: "Identity keeper",
    nextTitle: "Junior admin",
    badges: [
      { code: "first_exam" as const, attemptId: "a1", earnedAt: day },
      { code: "hat_trick" as const, attemptId: "a3", earnedAt: day },
    ],
    mastery: [
      { code: "identities", scaledScore: 880, tier: "gold" as const },
      { code: "networking", scaledScore: 640, tier: "none" as const },
    ],
    ...over,
  };
}

describe("ProgressionCard", () => {
  it("shows the level, the XP to the next one, domain mastery and badges (EN)", () => {
    renderIntl(<ProgressionCard progression={progression()} rules={PROGRESSION} domainTitles={{ identities: "Identities and governance" }} />);
    const card = screen.getByRole("region", { name: "My progression" });
    expect(within(card).getByTestId("level")).toHaveTextContent("Level 4 of 10 — Identity keeper");
    expect(within(card).getByText("Next: Junior admin")).toBeInTheDocument();
    expect(within(card).getByTestId("xp-next")).toHaveTextContent("900 XP — 300 XP to the next level (1200)");

    const gold = card.querySelector('[data-domain="identities"]')!;
    expect(gold).toHaveAttribute("data-tier", "gold");
    expect(gold).toHaveTextContent("GoldIdentities and governance880");
    expect(card.querySelector('[data-domain="networking"]')).toHaveTextContent("Not yetnetworking640");
    expect(within(card).getByText("Bronze from 650, silver from 700, gold from 850.")).toBeInTheDocument();

    expect(within(card).getByRole("heading", { name: "Badges (2 of 7)" })).toBeInTheDocument();
    expect(card.querySelectorAll('[data-earned="true"]')).toHaveLength(2);
    expect(card.querySelector('[data-badge="hat_trick"]')).toHaveTextContent("Hat trick3 exams in a row at 800 or more.Earned on Jan 5, 2026");
    expect(card.querySelector('[data-badge="comeback"]')).toHaveTextContent("ComebackGain 150 points or more from one exam to the next.Not earned yet");
    expect(card.querySelector('[data-badge="regular"]')).toHaveTextContent("An exam in each of 4 weeks in a row.");
    expect(card.querySelector('[data-badge="gold_domain"]')).toHaveTextContent("Score 850 or more in a domain.");
    expect(within(card).getByText(/Only the readiness index tells whether you are ready/)).toBeInTheDocument();
  });

  it("says when the top level is reached (FR)", () => {
    renderIntl(<ProgressionCard progression={progression({ xp: 5400, level: { n: 10, from: 5000, next: null }, title: "Légende du cloud", nextTitle: null, badges: [] })} rules={PROGRESSION} domainTitles={{}} />, "fr");
    expect(screen.getByTestId("level")).toHaveTextContent("Niveau 10 sur 10 — Légende du cloud");
    expect(screen.getByTestId("xp-next")).toHaveTextContent("5400 XP — niveau maximal atteint");
    expect(screen.queryByText(/Prochain/)).toBeNull();
    expect(screen.getByRole("heading", { name: "Badges (0 sur 7)" })).toBeInTheDocument();
  });
});

const GAIN: XpGain = {
  attemptId: "a1",
  total: 450,
  parts: [
    { code: "base", xp: 50 },
    { code: "score", xp: 225 },
    { code: "pass", xp: 100 },
    { code: "best", xp: 75 },
  ],
  levelBefore: 1,
  levelAfter: 3,
};

describe("XpGainCard", () => {
  it("shows the XP earned, a multi-level jump and new badges", () => {
    renderIntl(
      <XpGainCard
        gain={GAIN}
        xp={450}
        level={{ n: 3, title: "Resource pilot", from: 400, next: 750 }}
        levels={10}
        previousTitle="Cloud intern"
        badges={[{ code: "first_exam", attemptId: "a1", earnedAt: day }, { code: "first_pass", attemptId: "a1", earnedAt: day }]}
      />,
    );
    const card = screen.getByRole("region", { name: "Experience earned" });
    expect(within(card).getByTestId("xp-total")).toHaveTextContent("+450 XP");
    expect(within(card).getByText("Best score so far").parentElement).toHaveTextContent("+75");
    expect(within(card).getByTestId("level-up")).toHaveTextContent("2 levels up: 1 → 3!Cloud intern → Resource pilot");
    expect(within(card).getByTestId("xp-next")).toHaveTextContent("450 XP — 300 XP to the next level (750)");
    expect(within(card).getByRole("heading", { name: "New badges" })).toBeInTheDocument();
    expect(card.querySelectorAll("[data-badge]")).toHaveLength(2);
  });

  it("shows the level without a level-up nor badges (FR)", () => {
    renderIntl(
      <XpGainCard gain={{ ...GAIN, total: 150, parts: [{ code: "base", xp: 50 }, { code: "domains", xp: 100 }], levelBefore: 3, levelAfter: 3 }} xp={600} level={{ n: 3, title: "Pilote de ressources", from: 400, next: 750 }} levels={10} previousTitle={null} badges={[]} />,
      "fr",
    );
    expect(screen.queryByTestId("level-up")).toBeNull();
    expect(screen.getByTestId("level")).toHaveTextContent("Niveau 3 sur 10 — Pilote de ressources");
    expect(screen.getByText("Domaines en progrès")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /badge/i })).toBeNull();
  });

  it("names a single level-up", () => {
    renderIntl(<XpGainCard gain={{ ...GAIN, levelBefore: 2, levelAfter: 3 }} xp={450} level={{ n: 3, title: "Resource pilot", from: 400, next: 750 }} levels={10} previousTitle="Portal novice" badges={[]} />);
    expect(screen.getByTestId("level-up")).toHaveTextContent("Level up: 2 → 3!Portal novice → Resource pilot");
  });
});
