"use client";

import { useEffect, useRef, useState } from "react";

function remainingMs(deadlineAt: string | null, offset: number): number | null {
  return deadlineAt ? Math.max(0, new Date(deadlineAt).getTime() - (Date.now() + offset)) : null;
}

/**
 * Remaining time mirrored from the server: the deadline is the server's, and
 * the offset between the server and browser clocks is measured at each fetch.
 */
export function useCountdown(deadlineAt: string | null, serverNow: string) {
  const offset = useRef(0);
  const [remaining, setRemaining] = useState<number | null>(() => remainingMs(deadlineAt, new Date(serverNow).getTime() - Date.now()));
  // When the deadline or the server time changes (exam started, view
  // refreshed), compute the remaining time in this same render, so the timer
  // never shows a stale value or appears one tick after the question.
  const [synced, setSynced] = useState({ deadlineAt, serverNow });
  if (synced.deadlineAt !== deadlineAt || synced.serverNow !== serverNow) {
    setSynced({ deadlineAt, serverNow });
    // Right after a fetch, browser time + offset = server time: no clock read needed.
    setRemaining(deadlineAt ? Math.max(0, new Date(deadlineAt).getTime() - new Date(serverNow).getTime()) : null);
  }

  useEffect(() => {
    offset.current = new Date(serverNow).getTime() - Date.now();
    const tick = () => setRemaining(remainingMs(deadlineAt, offset.current));
    const id = window.setInterval(tick, 500);
    const first = window.setTimeout(tick, 0);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(first);
    };
  }, [deadlineAt, serverNow]);

  return remaining;
}

export function formatDuration(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
