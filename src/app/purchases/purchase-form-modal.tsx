"use client";

import { useActionState, useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { showToast } from "@/components/ui/toast";
import {
  createPurchaseAction,
  updatePurchaseAction,
  suggestPurchaseNoAction,
  type PurchaseFormState,
} from "./actions";

export type SupplierOption = { id: string; name: string };
export type ItemOption = { id: string; sku: string; name: string; unit: string };

// Same inline-creation sentinel as items' category field (src/app/items/item-form-modal.tsx).
const NEW_SUPPLIER = "__new__";

const labelClass =
  "font-sans text-[11.5px] font-medium tracking-[0.04em] text-ink-muted uppercase";
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

const money = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function lineTotal(quantity: string, unitCost: string): number {
  const q = Number(quantity);
  const c = Number(unitCost);
  return Number.isFinite(q) && Number.isFinite(c) ? q * c : 0;
}

type Line = { key: number; lineId?: string; itemId: string; quantity: string; unitCost: string };

// Module-scope counter, same pattern as toast.tsx's nextId — stable React
// keys for rows that get added/removed, without pulling in a uuid dependency.
let nextLineKey = 0;
function makeLine(itemId: string, lineId?: string, quantity = "", unitCost = ""): Line {
  return { key: nextLineKey++, lineId, itemId, quantity, unitCost };
}

function LineRow({
  index,
  line,
  items,
  removable,
  onChange,
  onRemove,
}: {
  index: number;
  line: Line;
  items: ItemOption[];
  removable: boolean;
  onChange: (line: Line) => void;
  onRemove: () => void;
}) {
  const selected = items.find((i) => i.id === line.itemId);

  return (
    <div className="rounded border border-hairline-2 bg-app px-3.5 py-3">
      {/* Carries which existing purchase_items row this line is, if any — an
          empty value means "new line" to updatePurchaseAction. Irrelevant to
          createPurchaseAction, which never sets it. */}
      <input type="hidden" name="lineId" value={line.lineId ?? ""} />
      <div className="flex items-center justify-between gap-2">
        <div className={labelClass}>Line {index + 1}</div>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="cursor-pointer font-sans text-[11.5px] text-ink-faint hover:text-alert"
          >
            Remove
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-col gap-2.5">
        <select
          name="itemId"
          required
          value={line.itemId}
          onChange={(e) => onChange({ ...line, itemId: e.target.value })}
          className={fieldClass}
        >
          {items.length === 0 && <option value="">No active items</option>}
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.sku} — {i.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2.5">
          <input
            name="quantity"
            required
            inputMode="decimal"
            placeholder={selected ? `Qty (${selected.unit})` : "Qty"}
            value={line.quantity}
            onChange={(e) => onChange({ ...line, quantity: e.target.value })}
            className={`${fieldClass} font-mono text-[13px]`}
          />
          <input
            name="unitCost"
            required
            inputMode="decimal"
            placeholder="Unit cost (RWF)"
            value={line.unitCost}
            onChange={(e) => onChange({ ...line, unitCost: e.target.value })}
            className={`${fieldClass} font-mono text-[13px]`}
          />
        </div>
        <div className="text-right font-mono text-[12px] text-ink-faint">
          Line total: {money.format(lineTotal(line.quantity, line.unitCost))}
        </div>
      </div>
    </div>
  );
}

function ErrorNote({ state }: { state: PurchaseFormState }) {
  if (!state || !("error" in state)) return null;
  return (
    <div className="rounded border border-warning-border bg-warning-bg px-3.5 py-2.5 font-sans text-[12.5px] text-warning-text">
      {state.error}
    </div>
  );
}

function Submit({ form, label, pending }: { form: string; label: string; pending: boolean }) {
  return (
    <button
      type="submit"
      form={form}
      disabled={pending}
      className="h-[46px] w-full cursor-pointer rounded bg-brand font-sans text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-70"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

function SupplierField({
  suppliers,
  supplierId,
  onChange,
}: {
  suppliers: SupplierOption[];
  supplierId: string;
  onChange: (id: string) => void;
}) {
  return (
    <>
      <Field label="Supplier">
        <select
          name="supplierId"
          value={supplierId}
          onChange={(e) => onChange(e.target.value)}
          className={fieldClass}
        >
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          <option value={NEW_SUPPLIER}>+ New supplier…</option>
        </select>
      </Field>
      {supplierId === NEW_SUPPLIER && (
        <Field label="New supplier name">
          <input name="newSupplierName" required className={fieldClass} autoFocus />
        </Field>
      )}
    </>
  );
}

function LinesEditor({
  lines,
  items,
  onChangeLines,
}: {
  lines: Line[];
  items: ItemOption[];
  onChangeLines: (updater: (lines: Line[]) => Line[]) => void;
}) {
  const total = lines.reduce((sum, l) => sum + lineTotal(l.quantity, l.unitCost), 0);

  return (
    <>
      <div className="mt-1 flex flex-col gap-2.5">
        {lines.map((line, index) => (
          <LineRow
            key={line.key}
            index={index}
            line={line}
            items={items}
            removable={lines.length > 1}
            onChange={(next) => onChangeLines((ls) => ls.map((l) => (l.key === next.key ? next : l)))}
            onRemove={() => onChangeLines((ls) => ls.filter((l) => l.key !== line.key))}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChangeLines((ls) => [...ls, makeLine(items[0]?.id ?? "")])}
        disabled={items.length === 0}
        className="flex cursor-pointer items-center gap-1.5 self-start font-sans text-[12.5px] font-medium text-brand disabled:opacity-50"
      >
        + Add line
      </button>

      <div className="flex items-center justify-between border-t border-hairline-2 pt-3 font-sans text-[13px] font-semibold text-ink">
        <span>Total</span>
        <span className="font-mono">{money.format(total)}</span>
      </div>
    </>
  );
}

export function RecordPurchaseModal({
  suppliers,
  items,
}: {
  suppliers: SupplierOption[];
  items: ItemOption[];
}) {
  const [open, setOpen] = useState(false);
  const [suggestedNo, setSuggestedNo] = useState<string>();
  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id ?? NEW_SUPPLIER);
  const [lines, setLines] = useState<Line[]>(() => [makeLine(items[0]?.id ?? "")]);

  const [state, action, pending] = useActionState<PurchaseFormState, FormData>(
    async (prevState, formData) => {
      const result = await createPurchaseAction(prevState, formData);
      if (result && "success" in result) {
        showToast("Purchase recorded");
        setOpen(false);
        setSuggestedNo(undefined);
        setSupplierId(suppliers[0]?.id ?? NEW_SUPPLIER);
        setLines([makeLine(items[0]?.id ?? "")]);
      }
      return result;
    },
    undefined,
  );

  // Fetched when the modal opens, same reasoning as the item SKU suggestion:
  // it has to reflect the sequence at the moment of opening.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    suggestPurchaseNoAction().then((no) => {
      if (!cancelled) setSuggestedNo(no);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-11 cursor-pointer items-center rounded bg-brand px-3.5 font-sans text-[13px] font-medium text-white hover:bg-brand-hover md:h-[34px]"
      >
        + Record purchase
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Record purchase"
        footer={<Submit form="record-purchase-form" label="Record purchase" pending={pending} />}
      >
        <form id="record-purchase-form" action={action} className="flex flex-col gap-3">
          <ErrorNote state={state} />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Purchase no.">
              <input
                name="purchaseNo"
                required
                defaultValue={suggestedNo ?? ""}
                key={suggestedNo ?? "loading"}
                className={`${fieldClass} font-mono text-[13px]`}
              />
            </Field>
            <Field label="Date">
              <input
                name="purchasedAt"
                type="date"
                required
                defaultValue={todayIso()}
                className={`${fieldClass} font-mono text-[13px]`}
              />
            </Field>
          </div>

          <SupplierField suppliers={suppliers} supplierId={supplierId} onChange={setSupplierId} />
          <LinesEditor lines={lines} items={items} onChangeLines={setLines} />
        </form>
      </Modal>
    </>
  );
}

export type PurchaseEditData = {
  id: string;
  purchaseNo: string;
  supplierId: string;
  purchasedAtIso: string;
  lines: { lineId: string; itemId: string; quantity: string; unitCost: string }[];
};

// Manager-only, opened from the purchase detail modal's "Edit" action — see
// backlog.md's costing-model note (7 Aug 2026) for why purchases moved from
// immutable to editable: last-purchase-price cost_price is a stateless
// lookup, not a running blend, so an edit can never leave stale/compounded
// numbers behind the way it would have under weighted-average costing.
export function EditPurchaseModal({
  purchase,
  suppliers,
  items,
  open,
  onClose,
}: {
  purchase: PurchaseEditData;
  suppliers: SupplierOption[];
  items: ItemOption[];
  open: boolean;
  onClose: () => void;
}) {
  const [supplierId, setSupplierId] = useState(purchase.supplierId);
  const [lines, setLines] = useState<Line[]>(() =>
    purchase.lines.map((l) => makeLine(l.itemId, l.lineId, l.quantity, l.unitCost)),
  );

  const [state, action, pending] = useActionState<PurchaseFormState, FormData>(
    async (prevState, formData) => {
      const result = await updatePurchaseAction(prevState, formData);
      if (result && "success" in result) {
        showToast("Purchase updated");
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
      title={`Edit ${purchase.purchaseNo}`}
      footer={<Submit form="edit-purchase-form" label="Save changes" pending={pending} />}
    >
      <form id="edit-purchase-form" action={action} className="flex flex-col gap-3">
        <input type="hidden" name="purchaseId" value={purchase.id} />
        <ErrorNote state={state} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Purchase no.">
            <input
              name="purchaseNo"
              required
              defaultValue={purchase.purchaseNo}
              className={`${fieldClass} font-mono text-[13px]`}
            />
          </Field>
          <Field label="Date">
            <input
              name="purchasedAt"
              type="date"
              required
              defaultValue={purchase.purchasedAtIso}
              className={`${fieldClass} font-mono text-[13px]`}
            />
          </Field>
        </div>

        <SupplierField suppliers={suppliers} supplierId={supplierId} onChange={setSupplierId} />
        <LinesEditor lines={lines} items={items} onChangeLines={setLines} />

        <div className="font-sans text-[11px] leading-[1.5] text-ink-faint">
          Saving updates stock and cost for every item on this purchase, and is logged to the
          audit log.
        </div>
      </form>
    </Modal>
  );
}
