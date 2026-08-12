"use client";

import { useState } from "react";
import { PurchaseDetailModal } from "./purchase-detail-modal";
import { EditPurchaseModal, type SupplierOption, type ItemOption } from "./purchase-form-modal";
import { GRID } from "./grid";

export type PurchaseLineRow = {
  id: string; // purchase_items id — also what EditPurchaseModal calls lineId
  itemId: string;
  itemName: string;
  itemSku: string;
  unit: string;
  quantity: string; // raw decimal string, for re-populating the edit form
  quantityDisplay: string;
  unitCost: string; // raw
  unitCostDisplay: string;
  lineTotalDisplay: string;
};

export type PurchaseRow = {
  id: string;
  purchaseNo: string;
  supplierId: string;
  supplierName: string;
  purchasedAtIso: string; // yyyy-mm-dd, for <input type="date">
  purchasedAtDisplay: string;
  lineCount: number;
  totalDisplay: string;
  recordedBy: string;
  lines: PurchaseLineRow[];
};

export function PurchasesTable({
  purchases,
  suppliers,
  items,
  pagination,
}: {
  purchases: PurchaseRow[];
  suppliers: SupplierOption[];
  items: ItemOption[];
  pagination?: React.ReactNode;
}) {
  const [selected, setSelected] = useState<PurchaseRow | null>(null);
  const [editing, setEditing] = useState(false);

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[5px] border border-border bg-card">
        <div
          className={`hidden ${GRID} gap-2 border-b border-hairline-2 bg-row-hover px-4.5 py-2.5 font-mono text-[10.5px] font-medium tracking-[0.06em] text-ink-faint md:grid`}
        >
          <div>PURCHASE</div>
          <div>SUPPLIER</div>
          <div>DATE</div>
          <div className="text-right">LINES</div>
          <div className="text-right">TOTAL</div>
          <div>RECORDED BY</div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {purchases.length === 0 && (
            <div className="px-4.5 py-8 text-center font-sans text-[13px] text-ink-faint">
              No purchases yet. Record the first one above.
            </div>
          )}
          {purchases.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setSelected(p);
                setEditing(false);
              }}
              className="block w-full border-b border-hairline px-4.5 py-3 text-left font-sans text-[13px] text-ink last:border-b-0 hover:bg-row-hover"
            >
              {/* Desktop: the spec's 6-column grid. */}
              <div className={`hidden ${GRID} items-center gap-2 md:grid`}>
                <div className="truncate font-mono text-xs text-ink-secondary">{p.purchaseNo}</div>
                <div className="truncate">{p.supplierName}</div>
                <div className="font-mono text-xs text-ink-secondary">{p.purchasedAtDisplay}</div>
                <div className="text-right text-ink-secondary">{p.lineCount}</div>
                <div className="text-right font-mono text-xs font-semibold">{p.totalDisplay}</div>
                <div className="truncate text-ink-secondary">{p.recordedBy}</div>
              </div>

              {/* Phone: purchase/supplier and total/lines as two right-aligned
                  lines, date and recorded-by drop to their own row underneath —
                  same shape as Items' mobile card. */}
              <div className="md:hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[13px] font-medium">{p.purchaseNo}</div>
                    <div className="mt-0.5 truncate font-sans text-[13px] text-ink-secondary">
                      {p.supplierName}
                    </div>
                  </div>
                  <div className="flex-none text-right">
                    <div className="font-mono text-[15px] leading-none font-semibold">{p.totalDisplay}</div>
                    <div className="mt-1 font-mono text-[10.5px] leading-none text-ink-faint">
                      {p.lineCount} line{p.lineCount === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-ink-faint">
                  <span>{p.purchasedAtDisplay}</span>
                  <span>{p.recordedBy}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="hidden flex-none border-t border-hairline px-4.5 py-2.5 font-sans text-[12.5px] text-ink-faint md:block">
          Cost price follows the most recent purchase for each item. Editing a purchase updates
          stock and cost immediately.
        </div>
        {pagination}
      </div>

      {selected && !editing && (
        <PurchaseDetailModal
          purchase={selected}
          open
          onClose={() => setSelected(null)}
          onEdit={() => setEditing(true)}
        />
      )}
      {selected && editing && (
        <EditPurchaseModal
          purchase={{
            id: selected.id,
            purchaseNo: selected.purchaseNo,
            supplierId: selected.supplierId,
            purchasedAtIso: selected.purchasedAtIso,
            lines: selected.lines.map((l) => ({
              lineId: l.id,
              itemId: l.itemId,
              quantity: l.quantity,
              unitCost: l.unitCost,
            })),
          }}
          suppliers={suppliers}
          items={items}
          open
          onClose={() => {
            setSelected(null);
            setEditing(false);
          }}
        />
      )}
    </>
  );
}
