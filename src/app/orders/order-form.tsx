"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Fields as CustomerFields } from "../customers/customer-form-modal";
import { createCustomerAction, type CustomerFormState } from "../customers/actions";
import { saveOrderAction, type OrderFormState } from "./actions";

export type CustomerOption = { id: string; code: string; name: string };

export type VehicleValues = {
  make: string;
  model: string;
  year: string;
  colour: string;
  vin: string;
  engineNo: string;
};

export type OrderFormValues = {
  id: string;
  customerId: string;
  goodsCategory: string;
  description: string;
  quantity: string;
  vehicles: VehicleValues[];
  originPort: string;
  destination: string;
  departureDate: string;
  eta: string;
  containerNo: string;
  blNo: string;
  currency: string;
  totalAmount: string;
};

// Exported: manager-edit-form.tsx reuses these same primitives rather than
// re-deriving a second copy of the order form's visual language.
export const labelClass = "font-sans text-[11.5px] font-medium tracking-[0.04em] text-ink-muted uppercase";
export const fieldClass =
  "focus-ring-brand h-[42px] w-full rounded border border-input-border px-3 font-sans text-base text-ink outline-none md:text-sm";
export const monoFieldClass = `${fieldClass} font-mono text-[15px] md:text-[13px]`;

// Matches the server-side cap in actions.ts, so the form can never render
// more vehicle blocks than a save would actually accept.
const MAX_QUANTITY = 50;
function clampQuantity(raw: string): number {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_QUANTITY) : 0;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "momo", label: "MoMo" },
  { value: "bank", label: "Bank" },
  { value: "card", label: "Card" },
] as const;

const GOODS_CATEGORIES = [
  { value: "vehicle", label: "Vehicle" },
  { value: "machinery", label: "Machinery" },
  { value: "electronics", label: "Electronics" },
  { value: "general", label: "General" },
] as const;

export function Field({
  label,
  optional,
  className = "",
  children,
}: {
  label: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label className={labelClass}>
        {label}
        {optional && <span className="text-ink-disabled normal-case"> · optional</span>}
      </label>
      {children}
    </div>
  );
}

// Numbered, brand-coloured section headers, per the mock — "1 · CUSTOMER"
// rather than a plain bold title. `right` carries the goods segmented
// control, which the mock puts inline on the header row.
export function SectionCard({
  step,
  title,
  right,
  children,
}: {
  step: number;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3.5 rounded-[5px] border border-border bg-card p-5 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-sans text-[12px] font-semibold tracking-[0.06em] text-brand uppercase">
          {step} · {title}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function ErrorNote({ state }: { state: OrderFormState | CustomerFormState }) {
  if (!state || !("error" in state)) return null;
  return (
    <div className="rounded border border-warning-border bg-warning-bg px-3.5 py-2.5 font-sans text-[13px] text-warning-text">
      {state.error}
    </div>
  );
}

function AddCustomerInline({ onCreated }: { onCreated: (c: CustomerOption) => void }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CustomerFormState, FormData>(async (prevState, formData) => {
    const result = await createCustomerAction(prevState, formData);
    if (result && "success" in result) {
      showToast("Customer added");
      setOpen(false);
      if (result.customer) onCreated(result.customer);
    }
    return result;
  }, undefined);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-[42px] flex-none cursor-pointer items-center rounded border border-brand px-4 font-sans text-[13px] font-medium text-brand hover:bg-brand/5"
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
            form="inline-add-customer-form"
            disabled={pending}
            className="flex h-[46px] w-full cursor-pointer items-center justify-center rounded bg-brand font-sans text-base font-semibold text-white hover:bg-brand-hover disabled:opacity-70"
          >
            {pending ? "Saving…" : "Save customer"}
          </button>
        }
      >
        <form id="inline-add-customer-form" action={action} className="flex flex-col gap-3.5">
          <ErrorNote state={state} />
          <CustomerFields />
        </form>
      </Modal>
    </>
  );
}

// Segmented control, per the mock — four always-visible options rather than
// a dropdown, so the vehicle fieldset's trigger is obvious at a glance.
// Backed by a hidden input so the value still submits as plain form data.
function GoodsCategoryPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <>
      <input type="hidden" name="goodsCategory" value={value} />
      <div className="flex w-full overflow-hidden rounded border border-input-border font-sans text-[12px] font-medium md:w-auto">
        {GOODS_CATEGORIES.map((g) => (
          <button
            key={g.value}
            type="button"
            aria-pressed={value === g.value}
            onClick={() => onChange(value === g.value ? "" : g.value)}
            className={`flex-1 cursor-pointer px-3 py-2 whitespace-nowrap md:flex-none md:px-3.5 md:py-[7px] ${
              value === g.value ? "bg-brand text-white" : "bg-card text-ink-muted hover:bg-row-hover"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>
    </>
  );
}

export function OrderForm({
  customers,
  existing,
  orderNoLabel,
  existingPayments = [],
}: {
  customers: CustomerOption[];
  existing?: OrderFormValues;
  // "ORD-2026-0088 · DRAFT" — the mock shows the number the order will get
  // (or already has) in the page header, so a staff member can quote it
  // before the paperwork is finished.
  orderNoLabel: string;
  existingPayments?: { id: string; amountDisplay: string; method: string; note: string | null }[];
}) {
  const router = useRouter();
  const [customerOptions, setCustomerOptions] = useState(customers);
  const [customerId, setCustomerId] = useState(existing?.customerId ?? "");
  const [goodsCategory, setGoodsCategory] = useState(existing?.goodsCategory ?? "");
  const [quantity, setQuantity] = useState(existing?.quantity ?? "1");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const vehicleCount = Math.max(1, clampQuantity(quantity));

  const [state, action, pending] = useActionState<OrderFormState, FormData>(async (prevState, formData) => {
    const result = await saveOrderAction(prevState, formData);
    if (result && "success" in result) {
      showToast(formData.get("intent") === "submit" ? "Order submitted" : "Draft saved");
      // Editing an existing draft pushes to the URL it's already on — a
      // same-URL push is a no-op in the App Router, so without an explicit
      // refresh the page keeps showing this exact form instance.
      router.push(`/orders/${result.orderId}`);
      router.refresh();
    }
    return result;
  }, undefined);

  // Not <form action={action}>: React resets every uncontrolled field in a
  // form after *any* action-driven submission completes, success or error —
  // fine for a small modal that closes on success, wrong here, where a
  // validation error ("fill in: VIN") should let the freight staff member fix
  // just that field, not watch the whole form blank itself out. Dispatching
  // manually from a plain onSubmit bypasses that automatic reset; the
  // submitter has to be passed to FormData explicitly so the clicked
  // draft/submit button's name+value still comes through.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // React bubbles events along the *component* tree, not the DOM tree — the
    // portaled "+ Add new customer" modal's own <form> is a DOM sibling of
    // <body> but still a React child of this one, so its submit reaches here
    // too. Only act when this form itself was actually submitted.
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const formData = new FormData(e.currentTarget, submitter ?? undefined);
    // `action` (useActionState's dispatch) expects to be invoked inside a
    // transition — passed straight to a <form action> prop, that's automatic;
    // called from a plain event handler like this, it has to be wrapped
    // explicitly or `pending` stops tracking the in-flight request.
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      {existing && <input type="hidden" name="orderId" value={existing.id} />}

      <div className="flex flex-wrap items-baseline justify-between gap-x-3.5 gap-y-1">
        <div className="flex items-baseline gap-3.5">
          <Link href="/orders" className="flex-none font-sans text-[13px] font-medium text-brand hover:underline">
            ← My orders
          </Link>
          <div className="font-sans text-[19px] font-semibold text-ink">
            {existing ? "Edit order" : "New order"}
          </div>
        </div>
        <div className="flex-none font-mono text-[12px] text-ink-faint">{orderNoLabel}</div>
      </div>

      <ErrorNote state={state} />

      <SectionCard step={1} title="Customer">
        <div className="flex items-end gap-3">
          <Field label="Search customer" className="flex-1">
            <select
              name="customerId"
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className={fieldClass}
            >
              <option value="">Select a customer…</option>
              {customerOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.code}
                </option>
              ))}
            </select>
          </Field>
          <AddCustomerInline
            onCreated={(c) => {
              setCustomerOptions((cs) => [...cs, c]);
              setCustomerId(c.id);
            }}
          />
        </div>
      </SectionCard>

      <SectionCard
        step={2}
        title="Goods"
        right={<GoodsCategoryPicker value={goodsCategory} onChange={setGoodsCategory} />}
      >
        <Field label="Description">
          <textarea
            name="description"
            rows={2}
            defaultValue={existing?.description}
            className="focus-ring-brand w-full resize-none rounded border border-input-border p-3 font-sans text-base text-ink outline-none md:text-sm"
          />
        </Field>

        {/* Quantity drives how many vehicle blocks appear below — a shipment
            of three cars needs three VINs, not one. Controlled (rather than
            a plain defaultValue) precisely so the blocks can react to it. */}
        <Field label={goodsCategory === "vehicle" ? "Number of vehicles" : "Quantity"} className="md:max-w-[190px]">
          <input
            name="quantity"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value.replace(/[^\d]/g, ""))}
            onBlur={() => setQuantity((q) => (clampQuantity(q) === 0 ? "1" : String(clampQuantity(q))))}
            className={monoFieldClass}
          />
        </Field>

        {goodsCategory === "vehicle" &&
          Array.from({ length: vehicleCount }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2.5 rounded border border-hairline-2 bg-app px-3.5 py-3">
              {vehicleCount > 1 && (
                <div className={labelClass}>
                  Vehicle {i + 1} of {vehicleCount}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Field label="Make">
                  <input name="vehMake" defaultValue={existing?.vehicles[i]?.make ?? ""} className={fieldClass} />
                </Field>
                <Field label="Model">
                  <input name="vehModel" defaultValue={existing?.vehicles[i]?.model ?? ""} className={fieldClass} />
                </Field>
                <Field label="Year">
                  <input
                    name="vehYear"
                    inputMode="numeric"
                    defaultValue={existing?.vehicles[i]?.year ?? ""}
                    className={monoFieldClass}
                  />
                </Field>
                <Field label="Colour">
                  <input name="vehColour" defaultValue={existing?.vehicles[i]?.colour ?? ""} className={fieldClass} />
                </Field>
                <Field label="VIN / chassis" className="col-span-2">
                  <input name="vehVin" defaultValue={existing?.vehicles[i]?.vin ?? ""} className={monoFieldClass} />
                </Field>
                <Field label="Engine no" className="col-span-2">
                  <input
                    name="vehEngineNo"
                    defaultValue={existing?.vehicles[i]?.engineNo ?? ""}
                    className={monoFieldClass}
                  />
                </Field>
              </div>
            </div>
          ))}
      </SectionCard>

      <SectionCard step={3} title="Shipping">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Origin port">
            <input name="originPort" defaultValue={existing?.originPort} className={fieldClass} />
          </Field>
          <Field label="Destination">
            <select name="destination" defaultValue={existing?.destination ?? ""} className={fieldClass}>
              <option value="">Select…</option>
              <option value="kigali">Kigali</option>
              <option value="goma">Goma</option>
              <option value="bukavu">Bukavu</option>
            </select>
          </Field>
          <Field label="Departure">
            <input
              name="departureDate"
              type="date"
              defaultValue={existing?.departureDate}
              className={monoFieldClass}
            />
          </Field>
          <Field label="ETA">
            <input name="eta" type="date" defaultValue={existing?.eta} className={monoFieldClass} />
          </Field>
          <Field label="Container no" optional className="col-span-2">
            <input name="containerNo" defaultValue={existing?.containerNo} className={monoFieldClass} />
          </Field>
          <Field label="Bill of lading" optional className="col-span-2">
            <input name="blNo" defaultValue={existing?.blNo} className={monoFieldClass} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard step={4} title="Price">
        <div className="grid grid-cols-[110px_1fr] gap-3 md:grid-cols-[140px_1fr]">
          <Field label="Currency">
            <select name="currency" defaultValue={existing?.currency ?? ""} className={fieldClass}>
              <option value="">—</option>
              <option value="USD">USD</option>
              <option value="RWF">RWF</option>
              <option value="CDF">CDF</option>
            </select>
          </Field>
          <Field label="Agreed total">
            {/* Emphasised in the mock — the one number on this form the whole
                order's balance is later computed against. */}
            <input
              name="totalAmount"
              inputMode="decimal"
              placeholder="0.00"
              defaultValue={existing?.totalAmount}
              className="focus-ring-brand h-[42px] w-full rounded border-[1.5px] border-brand px-3 font-mono text-[15px] font-medium text-ink shadow-[0_0_0_3px_rgba(40,117,180,.12)] outline-none"
            />
          </Field>
        </div>
        <div className="font-sans text-[12px] leading-[1.5] text-ink-faint">
          Balance is always computed from the payments below, never stored.
        </div>
      </SectionCard>

      {/* Not in the mock, which says payments come only after saving — but a
          customer usually pays a deposit at the moment the order is raised,
          and making staff save, reopen the order and then record it was
          needless friction. Optional: leave the amount blank for none. */}
      <SectionCard step={5} title="Payment received">
        {existingPayments.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded border border-hairline-2 bg-app px-3.5 py-3">
            <div className={labelClass}>Already recorded</div>
            {existingPayments.map((p) => (
              <div key={p.id} className="flex items-baseline justify-between gap-3 font-sans text-[12.5px]">
                <span className="min-w-0 truncate text-ink-secondary">
                  {p.method}
                  {p.note ? ` · ${p.note}` : ""}
                </span>
                <span className="flex-none font-mono text-ink">{p.amountDisplay}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Amount received" optional>
            <input
              name="paymentAmount"
              inputMode="decimal"
              placeholder="0.00"
              className={monoFieldClass}
            />
          </Field>
          <Field label="Method">
            <select
              name="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={fieldClass}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Note" optional className="col-span-2">
            <input name="paymentNote" placeholder="e.g. deposit" className={fieldClass} />
          </Field>
        </div>

        {paymentMethod === "cash" ? (
          <div className="font-sans text-[11.5px] text-ink-faint">
            Proof of payment is not required for cash. Leave the amount blank if nothing has been paid yet.
          </div>
        ) : (
          <label className="flex flex-col gap-1.5 font-sans text-[13px] text-ink">
            <span>
              Proof of payment
              <span className="text-alert">
                {" "}
                · required for {PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label}
              </span>
            </span>
            <input
              type="file"
              name="paymentProofFile"
              accept="image/*"
              capture="environment"
              className="font-sans text-[12.5px] text-ink-muted"
            />
          </label>
        )}
      </SectionCard>

      <div className="flex flex-col gap-2.5 pb-2 sm:flex-row sm:justify-end">
        <button
          type="submit"
          name="intent"
          value="draft"
          disabled={pending}
          className="h-11 cursor-pointer rounded border border-input-border bg-card px-5 font-sans text-[13.5px] font-medium text-ink-secondary hover:bg-row-hover disabled:opacity-70"
        >
          {pending ? "Saving…" : "Save draft"}
        </button>
        <button
          type="submit"
          name="intent"
          value="submit"
          disabled={pending}
          className="h-11 cursor-pointer rounded bg-brand px-6 font-sans text-[13.5px] font-semibold text-white hover:bg-brand-hover disabled:opacity-70"
        >
          {pending ? "Saving…" : "Submit for review"}
        </button>
      </div>
    </form>
  );
}
