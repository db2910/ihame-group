"use client";

import { useActionState, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { createUserAction, type CreateUserState } from "./actions";

const inputClass =
  // 16px on mobile, not text-sm's 14px — iOS Safari force-zooms the
  // viewport when a focused input renders under 16px.
  "focus-ring-brand h-[42px] w-full rounded border border-input-border px-3 font-sans text-base text-ink outline-none md:text-sm";
const labelClass =
  "font-sans text-[12.5px] font-medium tracking-[0.04em] text-ink-muted uppercase";

export function AddUserModal() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CreateUserState, FormData>(
    createUserAction,
    undefined,
  );

  function close() {
    setOpen(false);
  }

  const created = state && "success" in state ? state : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-11 cursor-pointer items-center rounded bg-brand px-3.5 font-sans text-[15px] font-medium text-white md:h-[34px]"
      >
        + Add user
      </button>

      <Modal
        open={open}
        onClose={close}
        title={created ? "User created" : "Add user"}
        footer={
          created ? (
            <button
              onClick={close}
              className="flex h-[46px] w-full cursor-pointer items-center justify-center rounded bg-brand font-sans text-base font-semibold text-white hover:bg-brand-hover"
            >
              Done
            </button>
          ) : (
            <button
              type="submit"
              form="add-user-form"
              disabled={pending}
              className="flex h-[46px] w-full cursor-pointer items-center justify-center rounded bg-brand font-sans text-base font-semibold text-white hover:bg-brand-hover disabled:opacity-70"
            >
              {pending ? "Creating…" : "Create user"}
            </button>
          )
        }
      >
        {created ? (
          <div className="flex flex-col gap-3">
            <div className="font-sans text-[15px] leading-[1.5] text-ink-secondary">
              Share this temporary password with <span className="font-medium">{created.email}</span>.
              They&apos;ll be required to set their own on first login.
            </div>
            <div className="rounded border border-border bg-app px-3 py-2.5 font-mono text-base text-ink select-all">
              {created.temporaryPassword}
            </div>
          </div>
        ) : (
          <form id="add-user-form" action={action} className="flex flex-col gap-3.5">
            {state && "error" in state && (
              <div className="rounded border border-warning-border bg-warning-bg px-3 py-2 font-sans text-[14px] text-warning-text">
                {state.error}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className={labelClass}>Name</label>
              <input id="name" name="name" required className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className={labelClass}>Email</label>
              <input id="email" name="email" type="email" required className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="role" className={labelClass}>Role</label>
              <select id="role" name="role" required defaultValue="freight_staff" className={inputClass}>
                <option value="manager">Manager</option>
                <option value="freight_staff">Freight staff</option>
                <option value="shop_staff">Shop staff</option>
              </select>
            </div>
            <div className="font-sans text-[12.5px] leading-[1.5] text-ink-faint">
              A temporary password is generated automatically. The new user must set their own on
              first login.
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
