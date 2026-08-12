"use client";

import { useActionState, useState } from "react";
import { signInAction, type LoginState } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    signInAction,
    undefined,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotNote, setShowForgotNote] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-4 md:gap-[26px]">
      <div className="flex flex-col gap-4 md:mt-0">
        {state?.error && (
          <div className="rounded border border-warning-border bg-warning-bg px-3.5 py-2.5 font-sans text-[14px] text-warning-text">
            {state.error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="font-sans text-[12px] font-medium tracking-[0.05em] text-ink-muted uppercase md:text-[12.5px] md:tracking-[0.04em]"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="focus-ring-brand h-[50px] rounded-[5px] border border-input-border px-3.5 font-sans text-[16px] text-ink outline-none md:h-11 md:rounded md:text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="font-sans text-[12px] font-medium tracking-[0.05em] text-ink-muted uppercase md:text-[12.5px] md:tracking-[0.04em]"
          >
            Password
          </label>
          <div className="focus-ring-brand-within flex h-[50px] items-center justify-between rounded-[5px] border border-input-border px-3.5 md:h-11 md:rounded">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              className="h-full min-w-0 flex-1 font-sans text-[16px] text-ink outline-none md:text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="ml-2 shrink-0 cursor-pointer font-sans text-[13.5px] font-medium text-brand md:text-[12.5px]"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 font-sans text-[14px] text-ink-secondary">
            <input
              type="checkbox"
              name="keepSignedIn"
              className="h-[15px] w-[15px] rounded-[3px] border border-input-border"
            />
            Keep me signed in
          </label>
          <button
            type="button"
            onClick={() => setShowForgotNote((v) => !v)}
            className="cursor-pointer font-sans text-[14px] font-medium text-brand"
          >
            Forgot password
          </button>
        </div>

        {showForgotNote && (
          <div className="-mt-1.5 font-sans text-[13.5px] leading-[1.5] text-ink-muted">
            Contact your manager to reset your password.
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex h-[52px] cursor-pointer items-center justify-center rounded-[5px] bg-brand font-sans text-[16px] font-semibold text-white select-none hover:bg-brand-hover disabled:opacity-70 md:h-[46px] md:rounded"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </div>

      <div className="hidden border-t border-[#EDEFF1] pt-4 font-sans text-[12.5px] leading-[1.5] text-ink-faint md:block">
        Accounts are created by the manager. Contact them if you are locked out.
      </div>
    </form>
  );
}
