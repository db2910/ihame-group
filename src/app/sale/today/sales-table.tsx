"use client";

import { useState } from "react";
import { VoidSaleModal } from "./void-sale-modal";
import { SaleDetailModal } from "./sale-detail-modal";

export type SaleLineRow = {
  id: string;
  itemName: string;
  itemSku: string;
  unit: string;
  quantityDisplay: string;
  unitPriceDisplay: string;
  lineTotalDisplay: string;
  isUnderPrice: boolean;
};

export type SaleRow = {
  id: string;
  saleNo: string;
  when: string;
  itemCount: number;
  total: string;
  paymentMethod: string;
  hasProofOfPayment: boolean;
  soldBy: string;
  isVoided: boolean;
  voidReason: string | null;
  lines: SaleLineRow[];
};

// WHEN · SALE · ITEMS · TOTAL · PAYMENT · SOLD BY · ACTION/STATUS.
const GRID = "grid-cols-[1fr_1fr_.6fr_1fr_.9fr_1.1fr_1.1fr]";

export function SalesTable({ sales, canVoid }: { sales: SaleRow[]; canVoid: boolean }) {
  const [selected, setSelected] = useState<SaleRow | null>(null);

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[5px] border border-border bg-card">
        <div
          className={`hidden ${GRID} gap-2 border-b border-hairline-2 bg-row-hover px-4.5 py-2.5 font-mono text-[11.5px] font-medium tracking-[0.06em] text-ink-faint md:grid`}
        >
          <div>WHEN</div>
          <div>SALE</div>
          <div className="text-right">ITEMS</div>
          <div className="text-right">TOTAL</div>
          <div>PAYMENT</div>
          <div>SOLD BY</div>
          <div className="text-right">{canVoid ? "ACTION" : "STATUS"}</div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {sales.length === 0 && (
            <div className="px-4.5 py-8 text-center font-sans text-[15px] text-ink-faint">
              No sales recorded today.
            </div>
          )}
          {sales.map((s) => (
            <div
              key={s.id}
              onClick={() => setSelected(s)}
              className="cursor-pointer border-b border-hairline px-4.5 py-3 font-sans text-[12.5px] text-ink last:border-b-0 hover:bg-row-hover md:text-[14px]"
            >
              {/* Desktop */}
              <div className={`hidden ${GRID} items-center gap-2 md:grid`}>
                <div className="min-w-0 font-mono text-[12.5px] text-ink-secondary">{s.when}</div>
                <div
                  className={`min-w-0 truncate font-mono text-[13px] ${s.isVoided ? "text-ink-faint line-through" : "text-ink"}`}
                >
                  {s.saleNo}
                </div>
                <div className="text-right font-mono text-[12.5px] text-ink-secondary">{s.itemCount}</div>
                <div className="text-right font-mono text-[13px] font-semibold text-ink">{s.total}</div>
                <div className="min-w-0 truncate text-ink-secondary">{s.paymentMethod}</div>
                <div className="min-w-0 truncate text-ink-secondary">{s.soldBy}</div>
                <div className="flex justify-end">
                  {s.isVoided ? (
                    <span className="font-sans text-[12px] text-alert">Voided</span>
                  ) : canVoid ? (
                    // Void opens its own confirm dialog — must not also open
                    // the (read-only) detail view underneath.
                    <span onClick={(e) => e.stopPropagation()}>
                      <VoidSaleModal saleId={s.id} saleNo={s.saleNo} />
                    </span>
                  ) : (
                    <span className="font-sans text-[12px] text-ink-faint">—</span>
                  )}
                </div>
              </div>

              {/* Phone card */}
              <div className="grid grid-cols-[1fr_auto] items-start gap-2 md:hidden">
                <div className="min-w-0">
                  <div
                    className={`truncate font-mono text-[13px] font-medium ${s.isVoided ? "text-ink-faint line-through" : "text-ink"}`}
                  >
                    {s.saleNo}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[11.5px] text-ink-faint">
                    {s.when} · {s.itemCount} item{s.itemCount === 1 ? "" : "s"} · {s.paymentMethod}
                  </div>
                  <div className="mt-0.5 truncate text-[11.5px] text-ink-faint">{s.soldBy}</div>
                  {s.isVoided && s.voidReason && (
                    <div className="mt-0.5 truncate text-[11px] text-alert">Voided: {s.voidReason}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 text-right">
                  <div className="font-mono text-[14px] font-semibold text-ink">{s.total}</div>
                  {s.isVoided ? (
                    <span className="font-sans text-[11px] text-alert">Voided</span>
                  ) : (
                    canVoid && (
                      <span onClick={(e) => e.stopPropagation()}>
                        <VoidSaleModal saleId={s.id} saleNo={s.saleNo} />
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && <SaleDetailModal sale={selected} open onClose={() => setSelected(null)} />}
    </>
  );
}
