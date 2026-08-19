"use client";

import { useActionState, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { showToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { resetPasswordAction, renameUserAction, toggleActiveAction, type ResetPasswordState, type RenameUserState } from "./actions";

export function EditNameButton({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<RenameUserState, FormData>(async (prevState, formData) => {
    const result = await renameUserAction(prevState, formData);
    if (result && "success" in result) {
      showToast("Name updated");
      setOpen(false);
    }
    return result;
  }, undefined);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer font-sans text-[12px] font-medium text-brand md:text-[13.5px]"
      >
        Edit name
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit name"
        footer={
          <button
            type="submit"
            form="edit-name-form"
            disabled={pending}
            className="flex h-[46px] w-full cursor-pointer items-center justify-center rounded bg-brand font-sans text-base font-semibold text-white hover:bg-brand-hover disabled:opacity-70"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        }
      >
        <form id="edit-name-form" action={action} className="flex flex-col gap-3.5">
          {state && "error" in state && (
            <div className="rounded border border-warning-border bg-warning-bg px-3 py-2 font-sans text-[14px] text-warning-text">
              {state.error}
            </div>
          )}
          <input type="hidden" name="userId" value={userId} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-name" className="font-sans text-[12.5px] font-medium tracking-[0.04em] text-ink-muted uppercase">
              Name
            </label>
            <input
              id="edit-name"
              name="name"
              required
              defaultValue={name}
              className="focus-ring-brand h-[42px] w-full rounded border border-input-border px-3 font-sans text-base text-ink outline-none md:text-sm"
            />
          </div>
          <div className="font-sans text-[12.5px] leading-[1.5] text-ink-faint">
            Email, role, and login stay the same — this only changes the name shown across the app.
            Useful for handing an existing login to someone new without losing the history tied to it.
          </div>
        </form>
      </Modal>
    </>
  );
}

export function ResetPasswordButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ResetPasswordState, FormData>(
    resetPasswordAction,
    undefined,
  );
  const result = state && "success" in state ? state : null;

  return (
    <>
      <button onClick={() => setOpen(true)} className="cursor-pointer font-sans text-[12px] font-medium text-brand md:text-[13.5px]">
        Reset password
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={result ? "Password reset" : "Reset password"}>
        {result ? (
          <div className="flex flex-col gap-3">
            <div className="font-sans text-[15px] leading-[1.5] text-ink-secondary">
              Share this new temporary password with the user. All of their existing sessions have
              been signed out, and they&apos;ll be required to set their own password on next login.
            </div>
            <div className="rounded border border-border bg-app px-3 py-2.5 font-mono text-base text-ink select-all">
              {result.temporaryPassword}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="mt-1 flex h-[46px] cursor-pointer items-center justify-center rounded bg-brand font-sans text-base font-semibold text-white hover:bg-brand-hover"
            >
              Done
            </button>
          </div>
        ) : (
          <form action={action} className="flex flex-col gap-3.5">
            {state && "error" in state && (
              <div className="rounded border border-warning-border bg-warning-bg px-3 py-2 font-sans text-[14px] text-warning-text">
                {state.error}
              </div>
            )}
            <input type="hidden" name="userId" value={userId} />
            <div className="font-sans text-[15px] leading-[1.5] text-ink-secondary">
              This generates a new temporary password and immediately signs the user out
              everywhere. Continue?
            </div>
            <button
              type="submit"
              disabled={pending}
              className="flex h-[46px] cursor-pointer items-center justify-center rounded bg-brand font-sans text-base font-semibold text-white hover:bg-brand-hover disabled:opacity-70"
            >
              {pending ? "Resetting…" : "Reset password"}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}

export function ToggleActiveButton({ userId, isActive }: { userId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const formData = new FormData();
    formData.set("userId", userId);
    startTransition(async () => {
      await toggleActiveAction(formData);
      showToast(isActive ? "User deactivated" : "User reactivated");
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`flex cursor-pointer items-center gap-1.5 font-sans text-[12px] font-medium disabled:cursor-default disabled:opacity-70 md:text-[13.5px] ${isActive ? "text-alert" : "text-success"}`}
    >
      {pending && <Spinner className="h-3 w-3" />}
      {pending ? (isActive ? "Deactivating…" : "Reactivating…") : isActive ? "Deactivate" : "Reactivate"}
    </button>
  );
}
