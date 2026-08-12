"use client";

import { useActionState } from "react";
import { changePasswordAction, type ChangePasswordState } from "../actions";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(
    changePasswordAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && (
        <div className="rounded border border-warning-border bg-warning-bg px-3.5 py-2.5 font-sans text-[14px] text-warning-text">
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="newPassword"
          className="font-sans text-[12.5px] font-medium tracking-[0.04em] text-ink-muted uppercase"
        >
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="focus-ring-brand h-11 rounded border border-input-border px-3 font-sans text-base text-ink outline-none md:text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="confirmPassword"
          className="font-sans text-[12.5px] font-medium tracking-[0.04em] text-ink-muted uppercase"
        >
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="focus-ring-brand h-11 rounded border border-input-border px-3 font-sans text-base text-ink outline-none md:text-sm"
        />
      </div>

      <div className="font-sans text-[12.5px] leading-[1.5] text-ink-faint">
        At least 10 characters.
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-1 flex h-[46px] cursor-pointer items-center justify-center rounded bg-brand font-sans text-base font-semibold text-white select-none hover:bg-brand-hover disabled:opacity-70"
      >
        {pending ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
