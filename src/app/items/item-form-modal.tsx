"use client";

import { useActionState, useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { showToast } from "@/components/ui/toast";
import {
  createItemAction,
  updateItemAction,
  suggestSkuAction,
  type ItemFormState,
} from "./actions";

export type CategoryOption = { id: string; name: string };

export type ItemFormValues = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  categoryId: string;
  unit: string;
  sellPrice: string;
  reorderLevel: string;
};

const UNITS = ["piece", "metre", "kg", "bag", "litre", "box"] as const;
const NEW_CATEGORY = "__new__";

const labelClass =
  "font-sans text-[12.5px] font-medium tracking-[0.04em] text-ink-muted uppercase";
const fieldClass =
  // 16px on the base (mobile) size, not text-sm's 14px — iOS Safari
  // force-zooms the viewport when a focused input renders under 16px.
  "focus-ring-brand h-11 w-full rounded border border-input-border px-3 font-sans text-base text-ink outline-none md:text-sm";

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
      {hint && <div className="font-sans text-[12px] leading-[1.4] text-ink-faint">{hint}</div>}
    </div>
  );
}

function ItemFields({
  categories,
  item,
  suggestedSku,
  unit,
  onUnitChange,
}: {
  categories: CategoryOption[];
  item?: ItemFormValues;
  suggestedSku?: string;
  unit: string;
  onUnitChange: (unit: string) => void;
}) {
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? categories[0]?.id ?? NEW_CATEGORY);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="SKU"
          hint={item ? undefined : "Auto-suggested — overwrite it to use a supplier's code."}
        >
          <input
            name="sku"
            required
            defaultValue={item?.sku ?? suggestedSku ?? ""}
            className={`${fieldClass} font-mono text-[16px] md:text-sm`}
          />
        </Field>
        <Field label="Barcode (optional)">
          <input
            name="barcode"
            defaultValue={item?.barcode ?? ""}
            className={`${fieldClass} font-mono text-[16px] md:text-sm`}
          />
        </Field>
      </div>

      <Field label="Item name">
        <input name="name" required defaultValue={item?.name ?? ""} className={fieldClass} />
      </Field>

      {/* 1.6fr/1fr, not an even split — category names are open text (a
          manager can type anything) while unit is a short fixed enum
          (piece/metre/kg/bag/litre/box), so an even split was clipping
          longer category names at the larger, iOS-zoom-safe input size. */}
      <div className="grid grid-cols-[1.6fr_1fr] gap-3">
        <Field label="Category">
          <select
            name="categoryId"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={fieldClass}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value={NEW_CATEGORY}>+ New category…</option>
          </select>
        </Field>
        <Field label="Unit">
          <select
            name="unit"
            value={unit}
            onChange={(e) => onUnitChange(e.target.value)}
            className={fieldClass}
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {categoryId === NEW_CATEGORY && (
        <Field label="New category name">
          <input name="newCategoryName" required className={fieldClass} autoFocus />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field
          label={`Sell price (RWF / ${unit})`}
          hint={`What a customer pays for one ${unit}.`}
        >
          <input
            name="sellPrice"
            required
            inputMode="decimal"
            defaultValue={item?.sellPrice ?? ""}
            className={`${fieldClass} font-mono text-[16px] md:text-sm`}
          />
        </Field>
        <Field
          label={`Reorder level (${unit})`}
          hint="Flags as low stock at or below this."
        >
          <input
            name="reorderLevel"
            required
            inputMode="decimal"
            defaultValue={item?.reorderLevel ?? "0"}
            className={`${fieldClass} font-mono text-[16px] md:text-sm`}
          />
        </Field>
      </div>
    </>
  );
}

// Optional and collapsed by default — folding it away is most of what makes
// the add form fit on a phone screen without scrolling past the submit
// button. Only relevant for a brand-new item; EditItemModal never renders it.
function OpeningStockDisclosure({ unit }: { unit: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex cursor-pointer items-center gap-1.5 self-start font-sans text-[14px] font-medium text-brand"
      >
        + Record opening stock
      </button>
    );
  }

  return (
    <div className="rounded border border-hairline-2 bg-app px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="font-sans text-[12px] leading-[1.5] text-ink-faint">
          Stock this item already has, entered once so its cost price isn&rsquo;t zero. Written
          to the ledger as an <span className="font-mono">opening</span> movement — after this,
          cost price only changes through purchases.
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="flex-none cursor-pointer font-sans text-[12.5px] text-ink-faint hover:text-ink-muted"
        >
          Remove
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label={`Quantity (${unit})`}>
          <input
            name="openingQuantity"
            inputMode="decimal"
            placeholder="0"
            className={`${fieldClass} bg-card font-mono text-[16px] md:text-sm`}
          />
        </Field>
        <Field
          label={`Cost per ${unit} (RWF)`}
          hint="What you paid for this stock."
        >
          <input
            name="openingCost"
            inputMode="decimal"
            placeholder="0.00"
            className={`${fieldClass} bg-card font-mono text-[16px] md:text-sm`}
          />
        </Field>
      </div>
    </div>
  );
}

// Lives in the modal's pinned footer, outside the <form> — `form=` ties it
// back so it still submits. Keeps it above the keyboard on a phone.
function Submit({ form, label, pending }: { form: string; label: string; pending: boolean }) {
  return (
    <button
      type="submit"
      form={form}
      disabled={pending}
      className="h-[46px] w-full cursor-pointer rounded bg-brand font-sans text-base font-semibold text-white hover:bg-brand-hover disabled:opacity-70"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

function ErrorNote({ state }: { state: ItemFormState }) {
  if (!state || !("error" in state)) return null;
  return (
    <div className="rounded border border-warning-border bg-warning-bg px-3.5 py-2.5 font-sans text-[14px] text-warning-text">
      {state.error}
    </div>
  );
}

export function AddItemModal({ categories }: { categories: CategoryOption[] }) {
  const [open, setOpen] = useState(false);
  const [suggestedSku, setSuggestedSku] = useState<string>();
  const [unit, setUnit] = useState<string>("piece");
  const [state, action, pending] = useActionState<ItemFormState, FormData>(
    async (prevState, formData) => {
      const result = await createItemAction(prevState, formData);
      if (result && "success" in result) {
        showToast("Item added");
        setOpen(false);
        setSuggestedSku(undefined);
        setUnit("piece");
      }
      return result;
    },
    undefined,
  );

  // Fetched when the modal opens rather than rendered into the page: the
  // suggestion has to reflect the sequence at the moment of opening, not at
  // the moment the list was last rendered.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    suggestSkuAction().then((sku) => {
      if (!cancelled) setSuggestedSku(sku);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-11 cursor-pointer items-center rounded bg-brand px-3.5 font-sans text-[15px] font-medium text-white hover:bg-brand-hover md:h-[34px]"
      >
        + Add item
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add item"
        footer={<Submit form="add-item-form" label="Add item" pending={pending} />}
      >
        <form id="add-item-form" action={action} className="flex flex-col gap-3">
          <ErrorNote state={state} />
          {/* Remounted per open so the suggested SKU lands in the field. */}
          <ItemFields
            key={suggestedSku ?? "loading"}
            categories={categories}
            suggestedSku={suggestedSku}
            unit={unit}
            onUnitChange={setUnit}
          />
          <OpeningStockDisclosure unit={unit} />
        </form>
      </Modal>
    </>
  );
}

export function EditItemModal({
  item,
  categories,
  open,
  onClose,
  deactivate,
}: {
  item: ItemFormValues;
  categories: CategoryOption[];
  open: boolean;
  onClose: () => void;
  // Rendered after the edit form, not inside it — deactivating is its own
  // Server Action and a nested <form> is invalid HTML.
  deactivate?: React.ReactNode;
}) {
  const [unit, setUnit] = useState(item.unit);
  const [state, action, pending] = useActionState<ItemFormState, FormData>(
    async (prevState, formData) => {
      const result = await updateItemAction(prevState, formData);
      if (result && "success" in result) {
        showToast("Item updated");
        onClose();
      }
      return result;
    },
    undefined,
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit ${item.name}`}
      footer={<Submit form="edit-item-form" label="Save changes" pending={pending} />}
    >
      <form id="edit-item-form" action={action} className="flex flex-col gap-3">
        <ErrorNote state={state} />
        <input type="hidden" name="itemId" value={item.id} />
        <ItemFields categories={categories} item={item} unit={unit} onUnitChange={setUnit} />
        <div className="font-sans text-[12px] leading-[1.5] text-ink-faint">
          Cost price is not editable here — it follows the item&rsquo;s most recent purchase.
          Edit that purchase, or correct stock quantity with an adjustment.
        </div>
      </form>
      {deactivate}
    </Modal>
  );
}
