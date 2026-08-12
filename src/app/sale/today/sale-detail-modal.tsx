"use client";

import { Modal } from "@/components/ui/modal";
import type { SaleRow } from "./sales-table";

const fieldLabelClass = "font-sans text-[11px] font-medium tracking-[0.04em] text-ink-faint uppercase";

// Read-only by design — no footer action, nothing here can be edited. Voiding
// stays a separate, deliberate action from the row itself, not folded into
// this view.
export function SaleDetailModal({ sale, open, onClose }: { sale: SaleRow; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={sale.saleNo}>
      <div className="flex flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className={fieldLabelClass}>When</div>
            <div className="mt-0.5 font-mono text-[13px] text-ink">{sale.when}</div>
          </div>
          <div>
            <div className={fieldLabelClass}>Payment</div>
            <div className="mt-0.5 font-sans text-[13px] text-ink">
              {sale.paymentMethod}
              {sale.paymentMethod !== "Cash" &&
                (sale.hasProofOfPayment ? (
                  <a
                    href={`/sale/${sale.id}/proof`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1.5 font-sans text-[11px] text-brand hover:underline"
                  >
                    · view proof
                  </a>
                ) : (
                  <span className="ml-1.5 font-sans text-[11px] text-alert">· no proof recorded</span>
                ))}
            </div>
          </div>
        </div>
        <div>
          <div className={fieldLabelClass}>Sold by</div>
          <div className="mt-0.5 font-sans text-[13px] text-ink">{sale.soldBy}</div>
        </div>

        {sale.isVoided && (
          <div className="rounded border border-warning-border bg-warning-bg px-3.5 py-2.5">
            <div className="font-sans text-[12.5px] font-semibold text-alert">Voided</div>
            {sale.voidReason && (
              <div className="mt-0.5 font-sans text-[12.5px] text-warning-text">{sale.voidReason}</div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2.5 border-t border-hairline-2 pt-3.5">
          {sale.lines.map((line) => (
            <div key={line.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-sans text-[12.5px] text-ink">{line.itemName}</div>
                <div className="mt-0.5 truncate font-mono text-[11px] text-ink-faint">
                  {line.itemSku} · {line.quantityDisplay} {line.unit} × {line.unitPriceDisplay}
                  {line.isUnderPrice && <span className="ml-1.5 font-sans text-warn">under price</span>}
                </div>
              </div>
              <div className="flex-none font-mono text-[12.5px] text-ink-secondary">{line.lineTotalDisplay}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-hairline-2 pt-3.5 font-sans text-[13.5px] font-semibold text-ink">
          <span>Total</span>
          <span className="font-mono">{sale.total}</span>
        </div>
      </div>
    </Modal>
  );
}
