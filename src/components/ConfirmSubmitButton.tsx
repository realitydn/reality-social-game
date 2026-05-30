"use client";

import { useState } from "react";
import ConfirmModal from "./ConfirmModal";

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

// A submit button that shows an in-app confirmation before submitting its
// parent <form> (which carries the server action). For destructive admin
// actions — switching/ending a game, ending a session — where a stray tap in a
// live room is costly. Drop-in replacement for a plain <button type="submit">.
export default function ConfirmSubmitButton({
  children,
  className,
  style,
  disabled,
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = "danger",
}: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<HTMLFormElement | null>(null);

  return (
    <>
      <button
        type="submit"
        className={className}
        style={style}
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          setForm(e.currentTarget.form);
          setOpen(true);
        }}
      >
        {children}
      </button>
      <ConfirmModal
        open={open}
        title={title}
        body={body}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        tone={tone}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          form?.requestSubmit();
        }}
      />
    </>
  );
}
