"use client";

import { useActionState } from "react";
import { login } from "@/lib/session-actions";

export default function LoginForm() {
  const [error, formAction, pending] = useActionState<string | null, FormData>(
    login,
    null,
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-6">
      <div className="mb-1 text-[22px] font-bold">todo</div>
      <div className="mb-6 text-[14px] text-muted">Locked.</div>

      <form action={formAction} className="flex flex-col gap-5">
        <label className="block">
          <span className="text-[12px] font-bold text-faint">Password</span>
          <input
            autoFocus
            required
            type="password"
            name="password"
            autoComplete="current-password"
            className="w-full rounded-xl bg-pill px-3 py-2 text-[16px] outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="press self-start rounded-full bg-ink px-5 py-2.5 text-[16px] font-bold text-on-ink shadow-[0_4px_0_var(--ink-shadow)] disabled:opacity-50"
        >
          {pending ? "Checking…" : "Enter"}
        </button>

        {error && (
          <p role="alert" className="text-[14px] font-bold text-accent">
            ! {error}
          </p>
        )}
      </form>
    </main>
  );
}
