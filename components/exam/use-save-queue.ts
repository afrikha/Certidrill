"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";

export type SavePatch = { response?: unknown; flagged?: boolean };
export type SaveStatus = "saved" | "saving" | "error";

const DEBOUNCE_MS = 250;
const MAX_BACKOFF_MS = 15_000;

/**
 * Autosave with an offline queue (spec §11 "Résilience"): every change is
 * sent as soon as possible; on network failure it is kept in localStorage and
 * re-sent with exponential backoff, and the UI shows "not saved".
 */
export function useSaveQueue(attemptId: string, onConflict: (code: string) => void) {
  const storageKey = `certidrill:pending:${attemptId}`;
  const pending = useRef(new Map<string, SavePatch>());
  const timer = useRef<number | undefined>(undefined);
  const backoff = useRef(1000);
  const flushing = useRef<Promise<boolean> | null>(null);
  const retry = useRef<() => void>(() => undefined);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const conflict = useRef(onConflict);
  useEffect(() => {
    conflict.current = onConflict;
  }, [onConflict]);

  const persist = useCallback(() => {
    try {
      if (pending.current.size) localStorage.setItem(storageKey, JSON.stringify([...pending.current]));
      else localStorage.removeItem(storageKey);
    } catch {
      /* storage unavailable: the in-memory queue still works */
    }
  }, [storageKey]);

  /**
   * Sends everything pending. Resolves to true when the queue is empty, false
   * when a save failed (network or server error) and is scheduled for retry.
   */
  const flush = useCallback(async (): Promise<boolean> => {
    if (flushing.current) return flushing.current;
    const run = async () => {
      window.clearTimeout(timer.current);
      while (pending.current.size) {
        const [itemId, patch] = pending.current.entries().next().value as [string, SavePatch];
        setStatus("saving");
        try {
          await api(`/api/attempts/${attemptId}/items/${itemId}`, { method: "PUT", body: patch });
          // Only drop the entry if it was not changed while the request was in flight.
          if (pending.current.get(itemId) === patch) pending.current.delete(itemId);
          backoff.current = 1000;
          persist();
        } catch (err) {
          if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
            pending.current.delete(itemId);
            persist();
            if (err.status === 409 || err.status === 404) conflict.current(err.code);
            continue;
          }
          setStatus("error");
          timer.current = window.setTimeout(() => retry.current(), backoff.current);
          backoff.current = Math.min(MAX_BACKOFF_MS, backoff.current * 2);
          return false;
        }
      }
      setStatus("saved");
      return true;
    };
    flushing.current = run().finally(() => {
      flushing.current = null;
    });
    return flushing.current;
  }, [attemptId, persist]);

  useEffect(() => {
    retry.current = () => void flush();
  }, [flush]);

  const enqueue = useCallback(
    (itemId: string, patch: SavePatch) => {
      pending.current.set(itemId, { ...pending.current.get(itemId), ...patch });
      persist();
      setStatus((s) => (s === "error" ? s : "saving"));
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), DEBOUNCE_MS);
    },
    [flush, persist],
  );

  // Replay what a previous page left unsent (closed tab, network loss).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        for (const [k, v] of JSON.parse(raw) as [string, SavePatch][]) pending.current.set(k, v);
        void flush();
      }
    } catch {
      /* ignore */
    }
    const online = () => void flush();
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (pending.current.size) e.preventDefault();
    };
    window.addEventListener("online", online);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("beforeunload", beforeUnload);
      window.clearTimeout(timer.current);
    };
  }, [flush, storageKey]);

  /** Pending local changes, to overlay on a freshly fetched server state. */
  const pendingPatches = useCallback(() => new Map(pending.current), []);
  return { enqueue, flush, status, pendingPatches };
}
