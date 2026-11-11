"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";

/** Accessible modal confirmation built on the native <dialog> element. */
export function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel, onConfirm, onCancel, busy }: {
  open: boolean;
  title: string;
  children?: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Several dialogs can be mounted at once: each needs its own title id.
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-border p-6 shadow-xl backdrop:bg-black/40"
    >
      <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 text-sm text-muted-foreground">{children}</div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
        <Button onClick={onConfirm} disabled={busy} autoFocus>{confirmLabel}</Button>
      </div>
    </dialog>
  );
}
