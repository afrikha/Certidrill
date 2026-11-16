"use client";

import { useEffect } from "react";

/**
 * Shows the "Copy" buttons of the code blocks rendered on the server
 * (lib/markdown.ts, hidden without script) and copies the block on click.
 */
export function CodeCopy({ copied }: Readonly<{ copied: string }>) {
  useEffect(() => {
    const buttons = [...document.querySelectorAll<HTMLButtonElement>("button[data-copy]")];
    if (!navigator.clipboard) return;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const onClick = async (event: Event) => {
      const button = event.currentTarget as HTMLButtonElement;
      const code = button.parentElement?.querySelector("pre")?.textContent ?? "";
      try {
        await navigator.clipboard.writeText(code);
      } catch {
        return;
      }
      const label = button.dataset.label ?? button.textContent ?? "";
      button.dataset.label = label;
      button.textContent = copied;
      timers.add(setTimeout(() => (button.textContent = label), 2000));
    };
    for (const b of buttons) {
      b.hidden = false;
      b.addEventListener("click", onClick);
    }
    return () => {
      for (const b of buttons) b.removeEventListener("click", onClick);
      for (const t of timers) clearTimeout(t);
    };
  }, [copied]);
  return null;
}
