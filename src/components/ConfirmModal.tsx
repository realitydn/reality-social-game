"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// REALITY-styled confirmation dialog for irreversible live actions (ending or
// switching a game, revealing an answer, opening voting, deleting). Replaces
// window.confirm so we can restate the live consequence ("8 of 12 still
// answering") and present a tap-friendly target in a dim bar.
export default function ConfirmModal({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-ink/70 flex items-center justify-center p-4 z-50"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-cream border-2 border-ink p-6 max-w-sm w-full flex flex-col gap-4"
        style={{ boxShadow: "0 12px 3px rgba(13, 9, 5, 0.18)" }}
      >
        <h2 className="font-display font-bold text-xl uppercase" style={{ letterSpacing: "0.05em" }}>
          {title}
        </h2>
        {body && <p className="font-body text-sm text-ink/70">{body}</p>}
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 border-2 border-ink text-ink font-display font-bold uppercase px-4 py-3 transition hover:bg-ink hover:text-cream disabled:opacity-50"
            style={{ letterSpacing: "0.05em" }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 ${tone === "danger" ? "bg-red" : "bg-ink"} text-cream font-display font-bold uppercase px-4 py-3 transition hover:translate-y-0.5 disabled:opacity-50`}
            style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
