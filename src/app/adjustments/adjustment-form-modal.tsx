"use client";

import { useActionState, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { showToast } from "@/components/ui/toast";
import { createAdjustmentAction, type AdjustmentFormState } from "./actions";

export type ItemOption = { id: string; sku: string; name: string; unit: string };

const labelClass =
  "font-sans text-[11.5px] font-medium tracking-[0.04em] text-ink-muted uppercase";
const fieldClass =
  "focus-ring-brand h-11 w-full rounded border border-input-border px-3 font-sans text-sm text-ink outline-none";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label className={labelClass}>{label}</label>
      {children}
      {hint && <div className="font-sans text-[11px] leading-[1.4] text-ink-faint">{hint}</div>}
    </div>
  );
}

type Direction = "in" | "out";

// Segmented in/out toggle rather than a free-typed signed number — a manager
// correcting stock on a phone is far less likely to mistype the sign this
// way, and the colour-coding doubles as a preview of how the row will read
// in the ledger (spec §6.5b: "+ green / − red").
function DirectionToggle({ value, onChange }: { value: Direction; onChange: (d: Direction) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <input type="hidden" name="direction" value={value} />
      <button
        type="button"
        onClick={() => onChange("in")}
        className={`h-11 cursor-pointer rounded border font-sans text-[13px] font-medium ${
          value === "in"
            ? "border-success bg-success text-white"
            : "border-input-border text-ink-secondary hover:bg-row-hover"
        }`}
      >
        + Stock in
      </button>
      <button
        type="button"
        onClick={() => onChange("out")}
        className={`h-11 cursor-pointer rounded border font-sans text-[13px] font-medium ${
          value === "out"
            ? "border-alert bg-alert text-white"
            : "border-input-border text-ink-secondary hover:bg-row-hover"
        }`}
      >
        − Stock out
      </button>
    </div>
  );
}

function ErrorNote({ state }: { state: AdjustmentFormState }) {
  if (!state || !("error" in state)) return null;
  return (
    <div className="rounded border border-warning-border bg-warning-bg px-3.5 py-2.5 font-sans text-[12.5px] text-warning-text">
      {state.error}
    </div>
  );
}

function Submit({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      form="new-adjustment-form"
      disabled={pending}
      className="h-[46px] w-full cursor-pointer rounded bg-brand font-sans text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-70"
    >
      {pending ? "Saving…" : "Save adjustment"}
    </button>
  );
}

export function AddAdjustmentModal({ items }: { items: ItemOption[] }) {
  const [open, setOpen] = useState(false);
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [direction, setDirection] = useState<Direction>("in");

  const [state, action, pending] = useActionState<AdjustmentFormState, FormData>(
    async (prevState, formData) => {
      const result = await createAdjustmentAction(prevState, formData);
      if (result && "success" in result) {
        showToast("Adjustment saved");
        setOpen(false);
        setItemId(items[0]?.id ?? "");
        setDirection("in");
      }
      return result;
    },
    undefined,
  );

  const selectedUnit = items.find((i) => i.id === itemId)?.unit;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-11 cursor-pointer items-center rounded bg-brand px-3.5 font-sans text-[13px] font-medium text-white hover:bg-brand-hover md:h-[34px]"
      >
        + New adjustment
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New adjustment"
        footer={<Submit pending={pending} />}
      >
        <form id="new-adjustment-form" action={action} className="flex flex-col gap-3">
          <ErrorNote state={state} />

          <Field label="Item">
            <select
              name="itemId"
              required
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className={fieldClass}
            >
              {items.length === 0 && <option value="">No active items</option>}
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.sku} — {i.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Direction">
            <DirectionToggle value={direction} onChange={setDirection} />
          </Field>

          <Field label={`Quantity${selectedUnit ? ` (${selectedUnit})` : ""}`}>
            <input
              name="quantity"
              required
              inputMode="decimal"
              placeholder="0"
              className={`${fieldClass} font-mono text-[13px]`}
            />
          </Field>

          <Field
            label="Reason"
            hint="Damage, loss, count variance, or a correction found in the store — at least 5 characters."
          >
            <textarea
              name="reason"
              required
              minLength={5}
              rows={3}
              className="focus-ring-brand w-full resize-none rounded border border-input-border px-3 py-2.5 font-sans text-sm text-ink outline-none"
            />
          </Field>

          <div className="font-sans text-[11px] leading-[1.5] text-ink-faint">
            No approval step — saving is final. This can&rsquo;t be edited afterward; a mistaken
            entry is corrected with another adjustment.
          </div>
        </form>
      </Modal>
    </>
  );
}
