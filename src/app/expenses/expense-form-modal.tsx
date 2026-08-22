"use client";

import { useActionState, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { showToast } from "@/components/ui/toast";
import { createExpenseAction, type CreateExpenseState } from "./actions";

const labelClass = "font-sans text-[11.5px] font-medium tracking-[0.04em] text-ink-muted uppercase";
const fieldClass =
  "focus-ring-brand h-11 w-full rounded border border-input-border px-3 font-sans text-sm text-ink outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const CATEGORIES = [
  { value: "supplier_cost", label: "Supplier cost" },
  { value: "transport", label: "Transport" },
  { value: "customs", label: "Customs" },
  { value: "other", label: "Other" },
] as const;

// Two ways this gets used: pinned to a specific order (order detail page —
// orderId/orderLabel set, not changeable) or free-standing (the general
// /expenses list — orderOptions given instead, defaulting to "no order").
export function AddExpenseButton({
  orderId,
  orderLabel,
  orderOptions,
  defaultCurrency,
}: {
  orderId?: string;
  orderLabel?: string;
  orderOptions?: { id: string; label: string }[];
  defaultCurrency?: string | null;
}) {
  const [open, setOpen] = useState(false);

  const [state, action, pending] = useActionState<CreateExpenseState, FormData>(async (prevState, formData) => {
    const result = await createExpenseAction(prevState, formData);
    if (result && "success" in result) {
      showToast("Expense recorded");
      setOpen(false);
    }
    return result;
  }, undefined);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 cursor-pointer items-center rounded bg-brand px-3.5 font-sans text-[15px] font-medium text-white md:h-[34px]"
      >
        + Add expense
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add expense"
        footer={
          <button
            type="submit"
            form="add-expense-form"
            disabled={pending}
            className="flex h-[46px] w-full cursor-pointer items-center justify-center rounded bg-brand font-sans text-base font-semibold text-white hover:bg-brand-hover disabled:opacity-70"
          >
            {pending ? "Saving…" : "Add expense"}
          </button>
        }
      >
        <form id="add-expense-form" action={action} className="flex flex-col gap-3.5">
          {state && "error" in state && (
            <div className="rounded border border-warning-border bg-warning-bg px-3.5 py-2.5 font-sans text-[13px] text-warning-text">
              {state.error}
            </div>
          )}

          {orderId ? (
            <>
              <input type="hidden" name="orderId" value={orderId} />
              <div className="flex items-center justify-between rounded border border-hairline-2 bg-app px-3.5 py-2.5">
                <span className="font-sans text-[12.5px] text-ink-faint">Order</span>
                <span className="font-mono text-[13px] font-medium text-ink">{orderLabel}</span>
              </div>
            </>
          ) : (
            <Field label="Order">
              <select name="orderId" defaultValue="" className={fieldClass}>
                <option value="">— No order (general expense) —</option>
                {orderOptions?.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Category">
            <select name="category" defaultValue="supplier_cost" className={fieldClass}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount">
              <input name="amount" required inputMode="decimal" className={`${fieldClass} font-mono text-[13px]`} />
            </Field>
            <Field label="Currency">
              <select name="currency" defaultValue={defaultCurrency ?? "USD"} className={fieldClass}>
                <option value="USD">USD</option>
                <option value="RWF">RWF</option>
                <option value="CDF">CDF</option>
              </select>
            </Field>
          </div>

          <Field label="Paid on">
            <input
              name="paidOn"
              type="date"
              required
              defaultValue={todayIso()}
              className={`${fieldClass} font-mono text-[13px]`}
            />
          </Field>

          <label className="flex flex-col gap-1.5 font-sans text-[13px] text-ink">
            <span>
              Receipt <span className="text-ink-faint">· optional</span>
            </span>
            <input
              type="file"
              name="proofFile"
              accept="image/*"
              capture="environment"
              className="font-sans text-[12.5px] text-ink-muted"
            />
          </label>

          <Field label="Note">
            <input name="note" placeholder="e.g. supplier name, invoice no." className={fieldClass} />
          </Field>
        </form>
      </Modal>
    </>
  );
}
