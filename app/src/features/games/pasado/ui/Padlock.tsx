"use client";

import { motion } from "framer-motion";

/** Shackle drops shut when `locked`. */
export function Padlock({ locked, className = "" }: { locked: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`h-5 w-5 ${className}`} fill="none" stroke="currentColor" strokeWidth={2.4}>
      <motion.path
        d="M7 11V8a5 5 0 0 1 10 0v3"
        strokeLinecap="round"
        initial={false}
        animate={{ y: locked ? 0 : -3, rotate: locked ? 0 : -18 }}
        style={{ originX: "70%", originY: "100%" }}
        transition={{ type: "spring", stiffness: 500, damping: 18 }}
      />
      <rect x="4.5" y="11" width="15" height="10" rx="2" fill="currentColor" stroke="none" />
    </svg>
  );
}
