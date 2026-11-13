"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { easeOut } from "@/lib/progress/celebration";

/**
 * Plays the results page animation once per attempt. The server renders the
 * final values; when the cards come into view, the steps (useStep) start from
 * their previous values and land on the final ones. Nothing moves with
 * "reduce motion", without IntersectionObserver, or when the attempt was
 * already celebrated in this browser; a click anywhere jumps to the end.
 * The animation is decorative: the final values are in the page from the start.
 */
interface Clock {
  /** performance.now() at the start; null while nothing plays. */
  t0: number | null;
}

const CelebrationClock = createContext<Clock>({ t0: null });

const STORAGE_PREFIX = "certidrill:celebrated:";

function seen(key: string): boolean {
  try {
    return window.localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

function remember(key: string): void {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // Private mode or blocked storage: the animation may play again, nothing else.
  }
}

export function Celebration({ id, children }: Readonly<{ id: string; children: ReactNode }>) {
  const ref = useRef<HTMLDivElement>(null);
  const [clock, setClock] = useState<Clock>({ t0: null });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window.matchMedia !== "function" || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const key = STORAGE_PREFIX + id;
    if (seen(key)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        remember(key);
        setClock({ t0: performance.now() });
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [id]);
  const skip = () => setClock((c) => (c.t0 === null ? c : { t0: null }));
  return (
    <CelebrationClock.Provider value={clock}>
      {/* Clicking only skips the animation; links and buttons inside keep working. */}
      <div ref={ref} onClickCapture={skip} className="space-y-6" data-testid="celebration" data-playing={clock.t0 !== null}>
        {children}
      </div>
    </CelebrationClock.Provider>
  );
}

/** True while the animation plays. */
export function useCelebrating(): boolean {
  return useContext(CelebrationClock).t0 !== null;
}

/**
 * Progress (0–1, eased unless `linear`) of a step starting `delay` ms after the
 * start and lasting `duration` ms. 1 when nothing plays: the final state.
 */
export function useStep(delay: number, duration: number, linear = false): number {
  const { t0 } = useContext(CelebrationClock);
  const [p, setP] = useState(0);
  useEffect(() => {
    if (t0 === null) return;
    let frame = 0;
    const tick = (now: number) => {
      const q = Math.min(1, Math.max(0, (now - t0 - delay) / duration));
      setP(linear ? q : easeOut(q));
      if (q < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [t0, delay, duration, linear]);
  return t0 === null ? 1 : p;
}

const CONFETTI_COLORS = ["--color-primary", "--color-success", "--color-warning", "#eab308"];

/** A short burst of confetti over the parent (positioned), when `fire` turns true. Decorative. */
export function Confetti({ fire }: Readonly<{ fire: boolean }>) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!fire || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.scale(ratio, ratio);
    const style = getComputedStyle(canvas);
    const colors = CONFETTI_COLORS.map((c) => (c.startsWith("--") ? style.getPropertyValue(c).trim() || "#1d4ed8" : c));
    // Deterministic pseudo-random spread (a small LCG): the same burst every time.
    let seed = 42;
    const rnd = () => {
      seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
      return seed / 4_294_967_296;
    };
    const pieces = Array.from({ length: 70 }, (_, i) => ({
      x: width * 0.55,
      y: 60,
      vx: (rnd() - 0.4) * 9,
      vy: -rnd() * 7 - 2,
      angle: rnd() * 6.3,
      spin: (rnd() - 0.5) * 0.4,
      size: 5 + rnd() * 4,
      color: colors[i % colors.length]!,
    }));
    const t0 = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      const age = (now - t0) / 1600;
      ctx.clearRect(0, 0, width, height);
      if (age >= 1) return;
      ctx.globalAlpha = 1 - age;
      for (const p of pieces) {
        p.vy += 0.28;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -2, p.size, 4);
        ctx.restore();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      ctx.clearRect(0, 0, width, height);
    };
  }, [fire]);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <canvas ref={ref} className="h-full w-full" />
    </div>
  );
}
