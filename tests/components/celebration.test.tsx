import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import { Celebration } from "@/components/progress/celebration";
import { ReadinessChange } from "@/components/progress/readiness-change";
import { XpGainCard } from "@/components/progress/xp-gain";
import type { Readiness, ReadinessCheck } from "@/lib/progress/readiness";
import type { XpGain } from "@/lib/progress/progression";
import { renderIntl } from "./render";

const BANDS = { progressing: 50, almost: 70, ready: 85 };
const LADDER = [
  { xp: 0, title: "Cloud intern" },
  { xp: 150, title: "Portal novice" },
  { xp: 400, title: "Resource pilot" },
  { xp: 750, title: "Identity keeper" },
  { xp: 1200, title: "Junior admin" },
  { xp: 1750, title: "Network specialist" },
];

function readiness(index: number, verdict: Readiness["verdict"], streakOk: boolean): Readiness {
  const checks: ReadinessCheck[] = [
    { code: "attempts", blocking: true, ok: true, value: 8, target: 3 },
    { code: "streak", blocking: true, ok: streakOk, value: streakOk ? 3 : 2, target: 3, min: 800 },
    { code: "index", blocking: true, ok: index >= 85, value: index, target: 85, criterion: "level" },
  ];
  return { index, raw: index, capped: false, verdict, ready: verdict === "ready", criteria: { level: 90, consistency: 90, domains: 80, freshness: 90 }, checks, attempts: 8, streak: 3, needed: 3, minScore: 800 };
}

const GAIN: XpGain = {
  attemptId: "a1",
  total: 446,
  parts: [
    { code: "base", xp: 50 },
    { code: "score", xp: 221 },
    { code: "pass", xp: 100 },
    { code: "best", xp: 75 },
  ],
  levelBefore: 4,
  levelAfter: 5,
};

// IntersectionObserver: the test decides when the cards come into view.
let observers: { callback: IntersectionObserverCallback; disconnected: boolean }[] = [];
class FakeObserver {
  entry: { callback: IntersectionObserverCallback; disconnected: boolean };
  constructor(callback: IntersectionObserverCallback) {
    this.entry = { callback, disconnected: false };
    observers.push(this.entry);
  }
  observe() {}
  disconnect() {
    this.entry.disconnected = true;
  }
}
const showCards = () =>
  act(() => {
    for (const o of observers.filter((x) => !x.disconnected)) o.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
  });

let reduce = false;
const drawn = vi.fn();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout", "clearTimeout"] });
  observers = [];
  reduce = false;
  window.localStorage.clear();
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  window.matchMedia = vi.fn((query: string) => ({ matches: reduce && query.includes("reduce") }) as MediaQueryList);
  const ctx = { scale: vi.fn(), clearRect: vi.fn(), save: vi.fn(), restore: vi.fn(), translate: vi.fn(), rotate: vi.fn(), fillRect: drawn, globalAlpha: 1, fillStyle: "" };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  drawn.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function results(id = "attempt-1") {
  return renderIntl(
    <Celebration id={id}>
      <ReadinessChange before={readiness(78, "almost", false)} after={readiness(86, "ready", true)} bands={BANDS} />
      <XpGainCard gain={GAIN} xp={1496} level={{ n: 5, title: "Junior admin", from: 1200, next: 1750 }} levels={10} previousTitle="Identity keeper" badges={[{ code: "hat_trick", attemptId: "a1", earnedAt: new Date(0) }]} ladder={LADDER} delay={2000} />
    </Celebration>,
  );
}

const index = () => screen.getByTestId("readiness-change-index").textContent;
const playing = () => screen.getByTestId("celebration").getAttribute("data-playing");

describe("results animation", () => {
  it("renders the final values, then plays from the previous ones once the cards are in view", () => {
    results();
    // Server render and first paint: the final state.
    expect(index()).toBe("86 / 100");
    expect(screen.getByTestId("xp-total")).toHaveTextContent("+446 XP");
    expect(playing()).toBe("false");

    showCards();
    expect(playing()).toBe("true");
    act(() => vi.advanceTimersByTime(16));
    // The start: previous index and level, nothing earned yet.
    expect(index()).toBe("78 / 100");
    expect(screen.getByTestId("readiness-change")).toHaveAttribute("data-verdict", "almost");
    expect(screen.getByTestId("readiness-unlocked").querySelector("li")).toHaveAttribute("data-ok", "false");
    expect(screen.getByTestId("xp-total")).toHaveTextContent("+0 XP");
    expect(screen.getByTestId("level")).toHaveTextContent("Level 4 of 10 — Identity keeper");
    expect(screen.queryByTestId("level-up")).toBeNull();

    // The gauge has crossed the "ready" band.
    act(() => vi.advanceTimersByTime(1600));
    expect(index()).toBe("86 / 100");
    expect(screen.getByTestId("readiness-change")).toHaveAttribute("data-verdict", "ready");

    // The end: everything lands on the final values, the level-up threw confetti.
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByTestId("readiness-unlocked").querySelector("li")).toHaveAttribute("data-ok", "true");
    expect(screen.getByTestId("xp-total")).toHaveTextContent("+446 XP");
    expect(screen.getByTestId("level-up")).toHaveTextContent("Level up: 4 → 5!Identity keeper → Junior admin");
    expect(screen.getByTestId("xp-next")).toHaveTextContent("1496 XP — 254 XP to the next level (1750)");
    // The confetti effect starts with the level-up render; its frames follow.
    act(() => vi.advanceTimersByTime(100));
    expect(drawn).toHaveBeenCalled();
    // Then it fades out and stops drawing.
    act(() => vi.advanceTimersByTime(2000));
    drawn.mockClear();
    act(() => vi.advanceTimersByTime(100));
    expect(drawn).not.toHaveBeenCalled();
  });

  it("plays once per attempt in this browser", () => {
    const { unmount } = results();
    showCards();
    unmount();
    results();
    expect(observers.filter((o) => !o.disconnected)).toHaveLength(0);
    expect(playing()).toBe("false");
    expect(index()).toBe("86 / 100");
  });

  it("jumps to the end on a click", () => {
    results();
    showCards();
    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByTestId("xp-total")).toHaveTextContent("+0 XP");
    fireEvent.click(screen.getByTestId("xp-gain"));
    expect(playing()).toBe("false");
    expect(screen.getByTestId("xp-total")).toHaveTextContent("+446 XP");
    expect(index()).toBe("86 / 100");
  });

  it("does not move when reduced motion is requested", () => {
    reduce = true;
    results();
    expect(observers).toHaveLength(0);
    expect(index()).toBe("86 / 100");
  });

  it("still plays when the browser storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    results();
    showCards();
    expect(playing()).toBe("true");
  });
});
