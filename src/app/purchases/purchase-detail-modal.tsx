"use client";

import { Modal } from "@/components/ui/modal";
import type { PurchaseRow } from "./purchases-table";

const fieldLabelClass = "font-sans text-[11px] font-medium tracking-[0.04em] text-ink-faint uppercase";

export function PurchaseDetailModal({
  purchase,
  open,
  onClose,
  onEdit,
}: {
  purchase: PurchaseRow;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={purchase.purchaseNo}
      footer={
        <button
          type="button"
          onClick={onEdit}
          className="h-[46px] w-full cursor-pointer rounded border border-input-border font-sans text-sm font-semibold text-ink-secondary hover:bg-row-hover"
        >
          Edit purchase
        </button>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className={fieldLabelClass}>Supplier</div>
            <div className="mt-0.5 font-sans text-[13px] text-ink">{purchase.supplierName}</div>
          </div>
          <div>
            <div className={fieldLabelClass}>Date</div>
            <div className="mt-0.5 font-mono text-[13px] text-ink">{purchase.purchasedAtDisplay}</div>
          </div>
        </div>
        <div>
          <div className={fieldLabelClass}>Recorded by</div>
          <div className="mt-0.5 font-sans text-[13px] text-ink">{purchase.recordedBy}</div>
        </div>

        <div className="flex flex-col gap-2.5 border-t border-hairline-2 pt-3.5">
          {purchase.lines.map((line) => (
            <div key={line.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-sans text-[12.5px] text-ink">{line.itemName}</div>
                <div className="mt-0.5 truncate font-mono text-[11px] text-ink-faint">
                  {line.itemSku} · {line.quantityDisplay} {line.unit} × {line.unitCostDisplay}
                </div>
              </div>
              <div className="flex-none font-mono text-[12.5px] text-ink-secondary">
                {line.lineTotalDisplay}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-hairline-2 pt-3.5 font-sans text-[13.5px] font-semibold text-ink">
          <span>Total</span>
          <span className="font-mono">{purchase.totalDisplay}</span>
        </div>

        <div className="font-sans text-[11px] leading-[1.5] text-ink-faint">
          Editing updates stock and cost for these items immediately, and is recorded in the
          audit log.
        </div>
      </div>
    </Modal>
  );
}
