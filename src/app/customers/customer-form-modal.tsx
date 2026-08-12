"use client";

import { useActionState, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { showToast } from "@/components/ui/toast";
import { createCustomerAction, updateCustomerAction, type CustomerFormState } from "./actions";

const inputClass =
  // 16px, not text-sm's 14px, on the base (mobile) size — iOS Safari
  // force-zooms the viewport when a focused input renders under 16px.
  "focus-ring-brand h-[42px] w-full rounded border border-input-border px-3 font-sans text-base text-ink outline-none md:text-sm";
const labelClass =
  "font-sans text-[12.5px] font-medium tracking-[0.04em] text-ink-muted uppercase";

type CustomerValues = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  idNumber: string | null;
  address: string | null;
  notes: string | null;
};

export function Fields({ defaults }: { defaults?: CustomerValues }) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className={labelClass}>Name</label>
        <input id="name" name="name" required defaultValue={defaults?.name} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className={labelClass}>Phone</label>
          <input id="phone" name="phone" defaultValue={defaults?.phone ?? ""} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={labelClass}>Email</label>
          <input id="email" name="email" type="email" defaultValue={defaults?.email ?? ""} className={inputClass} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="idNumber" className={labelClass}>ID number <span className="normal-case text-ink-faint">· national ID or passport</span></label>
        <input id="idNumber" name="idNumber" defaultValue={defaults?.idNumber ?? ""} className={inputClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="address" className={labelClass}>Address</label>
        <input id="address" name="address" defaultValue={defaults?.address ?? ""} className={inputClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className={labelClass}>Notes</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaults?.notes ?? ""}
          className="focus-ring-brand w-full resize-none rounded border border-input-border p-3 font-sans text-base text-ink outline-none md:text-sm"
        />
      </div>
    </>
  );
}

export function AddCustomerModal() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CustomerFormState, FormData>(
    async (prevState, formData) => {
      const result = await createCustomerAction(prevState, formData);
      if (result && "success" in result) {
        showToast("Customer added");
        setOpen(false);
      }
      return result;
    },
    undefined,
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 cursor-pointer items-center rounded border border-brand px-4 font-sans text-[15px] font-medium text-brand"
      >
        + Add new
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add customer"
        footer={
          <button
            type="submit"
            form="add-customer-form"
            disabled={pending}
            className="flex h-[46px] w-full cursor-pointer items-center justify-center rounded bg-brand font-sans text-base font-semibold text-white hover:bg-brand-hover disabled:opacity-70"
          >
            {pending ? "Saving…" : "Save customer"}
          </button>
        }
      >
        <form id="add-customer-form" action={action} className="flex flex-col gap-3.5">
          {state && "error" in state && (
            <div className="rounded border border-warning-border bg-warning-bg px-3 py-2 font-sans text-[14px] text-warning-text">
              {state.error}
            </div>
          )}
          <div className="font-sans text-[12.5px] leading-[1.5] text-ink-faint">
            A customer code is generated automatically once saved.
          </div>
          <Fields />
        </form>
      </Modal>
    </>
  );
}

export function EditCustomerButton({ customer }: { customer: CustomerValues }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CustomerFormState, FormData>(
    async (prevState, formData) => {
      const result = await updateCustomerAction(prevState, formData);
      if (result && "success" in result) {
        showToast("Customer updated");
        setOpen(false);
      }
      return result;
    },
    undefined,
  );

  return (
    <>
      <button onClick={() => setOpen(true)} className="cursor-pointer font-sans text-[13.5px] font-medium text-brand">
        Edit
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit customer"
        footer={
          <button
            type="submit"
            form="edit-customer-form"
            disabled={pending}
            className="flex h-[46px] w-full cursor-pointer items-center justify-center rounded bg-brand font-sans text-base font-semibold text-white hover:bg-brand-hover disabled:opacity-70"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        }
      >
        <form id="edit-customer-form" action={action} className="flex flex-col gap-3.5">
          {state && "error" in state && (
            <div className="rounded border border-warning-border bg-warning-bg px-3 py-2 font-sans text-[14px] text-warning-text">
              {state.error}
            </div>
          )}
          <input type="hidden" name="customerId" value={customer.id} />
          <Fields defaults={customer} />
        </form>
      </Modal>
    </>
  );
}
