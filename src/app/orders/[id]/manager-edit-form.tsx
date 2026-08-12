"use client";

import { startTransition, useActionState } from "react";
import { showToast } from "@/components/ui/toast";
import { updateOrderAction, type UpdateOrderState } from "../actions";
import { Field, SectionCard, fieldClass, monoFieldClass, labelClass } from "../order-form";

export type ManagerEditableOrder = {
  id: string;
  goodsCategory: string;
  quantity: number;
  description: string;
  vehicles: { make: string; model: string; year: string; colour: string; vin: string; engineNo: string }[];
  originPort: string;
  destination: string;
  departureDate: string;
  eta: string;
  containerNo: string;
  blNo: string;
  currency: string;
  totalAmount: string;
};

function ErrorNote({ state }: { state: UpdateOrderState }) {
  if (!state || !("error" in state)) return null;
  return (
    <div className="rounded border border-warning-border bg-warning-bg px-3.5 py-2.5 font-sans text-[13px] text-warning-text">
      {state.error}
    </div>
  );
}

// Manager's post-submit edit form — a deliberately narrower sibling of
// order-form.tsx's OrderForm (see updateOrderAction's own comment for why
// customer/category/quantity aren't here): same visual language, reused
// primitives, no draft/submit split, no payment-received section (that's
// what the order detail view's own Record-payment modal is for).
export function ManagerEditForm({
  order,
  onSaved,
  onCancel,
}: {
  order: ManagerEditableOrder;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState<UpdateOrderState, FormData>(async (prevState, formData) => {
    const result = await updateOrderAction(prevState, formData);
    if (result && "success" in result) {
      showToast("Order updated");
      onSaved();
    }
    return result;
  }, undefined);

  // Same reasoning as OrderForm's handleSubmit: <form action={action}> would
  // reset every uncontrolled field after a validation error, wiping out
  // everything the manager just typed instead of letting them fix one field.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => action(formData));
  }

  const vehicleCount = order.goodsCategory === "vehicle" ? Math.max(1, order.quantity) : 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <input type="hidden" name="orderId" value={order.id} />
      <input type="hidden" name="goodsCategory" value={order.goodsCategory} />
      <input type="hidden" name="quantity" value={order.quantity} />

      <ErrorNote state={state} />

      <SectionCard step={1} title="Goods">
        <Field label="Description">
          <textarea
            name="description"
            rows={2}
            defaultValue={order.description}
            className="focus-ring-brand w-full resize-none rounded border border-input-border p-3 font-sans text-base text-ink outline-none md:text-sm"
          />
        </Field>

        {vehicleCount > 0 &&
          Array.from({ length: vehicleCount }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2.5 rounded border border-hairline-2 bg-app px-3.5 py-3">
              {vehicleCount > 1 && (
                <div className={labelClass}>
                  Vehicle {i + 1} of {vehicleCount}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Field label="Make">
                  <input name="vehMake" defaultValue={order.vehicles[i]?.make ?? ""} className={fieldClass} />
                </Field>
                <Field label="Model">
                  <input name="vehModel" defaultValue={order.vehicles[i]?.model ?? ""} className={fieldClass} />
                </Field>
                <Field label="Year">
                  <input
                    name="vehYear"
                    inputMode="numeric"
                    defaultValue={order.vehicles[i]?.year ?? ""}
                    className={monoFieldClass}
                  />
                </Field>
                <Field label="Colour">
                  <input name="vehColour" defaultValue={order.vehicles[i]?.colour ?? ""} className={fieldClass} />
                </Field>
                <Field label="VIN / chassis" className="col-span-2">
                  <input name="vehVin" defaultValue={order.vehicles[i]?.vin ?? ""} className={monoFieldClass} />
                </Field>
                <Field label="Engine no" className="col-span-2">
                  <input
                    name="vehEngineNo"
                    defaultValue={order.vehicles[i]?.engineNo ?? ""}
                    className={monoFieldClass}
                  />
                </Field>
              </div>
            </div>
          ))}
      </SectionCard>

      <SectionCard step={2} title="Shipping">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Origin port">
            <input name="originPort" defaultValue={order.originPort} className={fieldClass} />
          </Field>
          <Field label="Destination">
            <select name="destination" defaultValue={order.destination} className={fieldClass}>
              <option value="">Select…</option>
              <option value="kigali">Kigali</option>
              <option value="goma">Goma</option>
              <option value="bukavu">Bukavu</option>
            </select>
          </Field>
          <Field label="Departure">
            <input name="departureDate" type="date" defaultValue={order.departureDate} className={monoFieldClass} />
          </Field>
          <Field label="ETA">
            <input name="eta" type="date" defaultValue={order.eta} className={monoFieldClass} />
          </Field>
          <Field label="Container no" optional className="col-span-2">
            <input name="containerNo" defaultValue={order.containerNo} className={monoFieldClass} />
          </Field>
          <Field label="Bill of lading" optional className="col-span-2">
            <input name="blNo" defaultValue={order.blNo} className={monoFieldClass} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard step={3} title="Price">
        <div className="grid grid-cols-[110px_1fr] gap-3 md:grid-cols-[140px_1fr]">
          <Field label="Currency">
            <select name="currency" defaultValue={order.currency} className={fieldClass}>
              <option value="">—</option>
              <option value="USD">USD</option>
              <option value="RWF">RWF</option>
              <option value="CDF">CDF</option>
            </select>
          </Field>
          <Field label="Agreed total">
            <input
              name="totalAmount"
              inputMode="decimal"
              placeholder="0.00"
              defaultValue={order.totalAmount}
              className="focus-ring-brand h-[42px] w-full rounded border-[1.5px] border-brand px-3 font-mono text-[15px] font-medium text-ink shadow-[0_0_0_3px_rgba(40,117,180,.12)] outline-none"
            />
          </Field>
        </div>
      </SectionCard>

      <div className="flex flex-col gap-2.5 pb-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="h-11 cursor-pointer rounded border border-input-border bg-card px-5 font-sans text-[13.5px] font-medium text-ink-secondary hover:bg-row-hover disabled:opacity-70"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="h-11 cursor-pointer rounded bg-brand px-6 font-sans text-[13.5px] font-semibold text-white hover:bg-brand-hover disabled:opacity-70"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
