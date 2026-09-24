"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Centered dialog. Deliberately not a bottom sheet: on a phone the software
 * keyboard covers the bottom of the viewport, which hid the very input the
 * sheet existed to show.
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // Freeze the page behind the dialog so iOS doesn't scroll it under the keyboard.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-ink/35 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="my-auto w-full max-w-[400px] rounded-[22px] bg-card p-5 shadow-[0_8px_0_var(--card-shadow)]"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[17px] font-bold">{title}</span>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-pill text-[13px] leading-none text-muted"
              >
                ✕
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-[12px] font-bold text-faint">{label}</span>
      <input
        {...props}
        className="mt-1 w-full rounded-xl bg-pill px-3 py-2 text-[16px] outline-none"
      />
    </label>
  );
}

/** Chip row used for category selection in every dialog. */
export function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-pill-deep px-3 py-1.5 text-[13px] font-bold text-ink"
          : "rounded-full bg-pill px-3 py-1.5 text-[13px] font-bold text-muted"
      }
    >
      {children}
    </button>
  );
}
