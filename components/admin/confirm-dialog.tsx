"use client";

import { useEffect, useRef } from "react";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "danger",
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "danger" | "gold";
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4" role="presentation">
      <div aria-hidden="true" onClick={onCancel} className="absolute inset-0 bg-imperial/85 backdrop-blur-sm" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        className="relative w-full max-w-md border border-white/12 bg-[#0d1017] p-6 shadow-lift"
      >
        <h2 id="confirm-title" className="font-display text-2xl text-ivory">
          {title}
        </h2>
        <p id="confirm-description" className="mt-3 text-[0.82rem] leading-relaxed text-silver/70">
          {description}
        </p>
        <div className="mt-7 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn-dark btn-sm" disabled={pending}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={
              tone === "danger"
                ? "btn btn-sm bg-danger text-imperial hover:bg-[#d47070] disabled:opacity-60"
                : "btn-gold btn-sm"
            }
          >
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
