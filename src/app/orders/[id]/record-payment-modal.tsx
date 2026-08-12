"use client";

import { useActionState, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { showToast } from "@/components/ui/toast";
import { recordOrderPaymentAction, type PaymentFormState } from "../actions";

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

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "momo", label: "MoMo" },
  { value: "bank", label: "Bank" },
  { value: "card", label: "Card" },
] as const;

export function RecordPaymentModal({
  orderId,
  defaultCurrency,
  balanceDisplay,
}: {
  orderId: string;
  defaultCurrency: string | null;
  // Balance is never entered — it's always total_amount minus payments so
  // far (src/lib/order-balance.ts). Shown here so it's obvious where that
  // number comes from right where a payment gets recorded against it,
  // instead of only appearing after closing the modal.
  balanceDisplay: string;
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]["value"]>("cash");

  const [state, action, pending] = useActionState<PaymentFormState, FormData>(async (prevState, formData) => {
    const result = await recordOrderPaymentAction(prevState, formData);
    if (result && "success" in result) {
      showToast("Payment recorded");
      setOpen(false);
      setMethod("cash");
    }
    return result;
  }, undefined);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-full cursor-pointer items-center justify-center rounded border-[1.5px] border-dashed border-brand font-sans text-[13px] font-semibold text-brand hover:bg-brand/5"
      >
        + Record a payment
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Record payment"
        footer={
          <button
            type="submit"
            form="record-payment-form"
            disabled={pending}
            className="flex h-[46px] w-full cursor-pointer items-center justify-center rounded bg-brand font-sans text-base font-semibold text-white hover:bg-brand-hover disabled:opacity-70"
          >
            {pending ? "Saving…" : "Record payment"}
          </button>
        }
      >
        <form id="record-payment-form" action={action} className="flex flex-col gap-3">
          <input type="hidden" name="orderId" value={orderId} />

          <div className="flex items-center justify-between rounded border border-hairline-2 bg-app px-3.5 py-2.5">
            <span className="font-sans text-[12.5px] text-ink-faint">Outstanding balance</span>
            <span className="font-mono text-[14px] font-semibold text-ink">{balanceDisplay}</span>
          </div>

          {state && "error" in state && (
            <div className="rounded border border-warning-border bg-warning-bg px-3.5 py-2.5 font-sans text-[13px] text-warning-text">
              {state.error}
            </div>
          )}

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

          <Field label="Exchange rate">
            <input
              name="exchangeRate"
              required
              defaultValue="1"
              inputMode="decimal"
              className={`${fieldClass} font-mono text-[13px]`}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Method">
              <select
                name="method"
                value={method}
                onChange={(e) => setMethod(e.target.value as typeof method)}
                className={fieldClass}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Paid on">
              <input
                name="paidOn"
                type="date"
                required
                defaultValue={todayIso()}
                className={`${fieldClass} font-mono text-[13px]`}
              />
            </Field>
          </div>

          {method === "cash" ? (
            <div className="font-sans text-[11.5px] text-ink-faint">
              Proof of payment is not required for cash.
            </div>
          ) : (
            <label className="flex flex-col gap-1.5 font-sans text-[13px] text-ink">
              <span>
                Proof of payment{" "}
                <span className="text-alert">· required for {PAYMENT_METHODS.find((m) => m.value === method)?.label}</span>
              </span>
              <input
                type="file"
                name="proofFile"
                accept="image/*"
                capture="environment"
                className="font-sans text-[12.5px] text-ink-muted"
              />
            </label>
          )}

          <Field label="Note">
            <input name="note" placeholder="e.g. deposit, balance" className={fieldClass} />
          </Field>
        </form>
      </Modal>
    </>
  );
}
