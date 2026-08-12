import Link from "next/link";
import { GRID, GRID_WITH_STAFF } from "./grid";
import { STATUS_LABEL, STATUS_PILL } from "./format";
import type { OrderStatus } from "@/generated/prisma/enums";

export type OrderRow = {
  id: string;
  orderNo: string;
  customerName: string;
  goodsSummary: string;
  destinationLabel: string | null;
  staffName?: string;
  etaDisplay: string | null;
  status: OrderStatus;
  balanceDisplay: string | null;
};

function StatusPill({ status, className = "" }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={`inline-flex flex-none items-center rounded-full px-2.5 py-[3px] font-sans text-[11px] font-medium ${STATUS_PILL[status]} ${className}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function OrdersTable({
  orders,
  footer,
  pagination,
  showStaff = false,
}: {
  orders: OrderRow[];
  footer?: string;
  pagination?: React.ReactNode;
  showStaff?: boolean;
}) {
  const grid = showStaff ? GRID_WITH_STAFF : GRID;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[5px] border border-border bg-card">
      <div
        className={`hidden ${grid} gap-2 border-b border-hairline-2 bg-row-hover px-4.5 py-2.5 font-mono text-[10.5px] font-medium tracking-[0.06em] text-ink-faint md:grid`}
      >
        <div>ORDER</div>
        <div>CUSTOMER</div>
        <div>GOODS</div>
        <div>DEST</div>
        {showStaff && <div>STAFF</div>}
        <div>ETA</div>
        <div>STATUS</div>
        <div className="text-right">BALANCE</div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {orders.length === 0 && (
          <div className="px-4.5 py-8 text-center font-sans text-[13px] text-ink-faint">
            {showStaff ? "No orders match these filters." : "No orders yet. Create the first one above."}
          </div>
        )}
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/orders/${o.id}`}
            className="block w-full border-b border-hairline px-4.5 py-3 text-left font-sans text-[13px] text-ink last:border-b-0 hover:bg-row-hover"
          >
            <div className={`hidden ${grid} items-center gap-2 md:grid`}>
              <div className="truncate font-mono text-[12.5px] text-ink">{o.orderNo}</div>
              <div className="truncate">{o.customerName}</div>
              <div className="truncate text-ink-secondary">{o.goodsSummary}</div>
              <div className="truncate text-ink-secondary">{o.destinationLabel ?? "—"}</div>
              {showStaff && <div className="truncate text-ink-secondary">{o.staffName ?? "—"}</div>}
              <div className="font-mono text-xs text-ink-secondary">{o.etaDisplay ?? "—"}</div>
              <div className="min-w-0">
                <StatusPill status={o.status} />
              </div>
              <div className="text-right font-mono text-[12.5px]">{o.balanceDisplay ?? "—"}</div>
            </div>

            <div className="md:hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-mono text-[13px] font-medium">{o.orderNo}</div>
                  <div className="mt-0.5 truncate font-sans text-[13px] text-ink-secondary">{o.customerName}</div>
                </div>
                <div className="flex flex-none flex-col items-end gap-1.5">
                  <div className="font-mono text-[15px] leading-none font-semibold">{o.balanceDisplay ?? "—"}</div>
                  <StatusPill status={o.status} />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[11px] text-ink-faint">
                <span className="min-w-0 truncate">{o.goodsSummary}</span>
                <span className="flex-none">
                  {o.destinationLabel ?? "—"} · {o.etaDisplay ?? "no ETA"}
                </span>
              </div>
              {showStaff && o.staffName && (
                <div className="mt-1 truncate font-mono text-[11px] text-ink-faint">{o.staffName}</div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {footer && (
        <div className="flex-none border-t border-hairline px-4.5 py-2.5 font-sans text-[12.5px] text-ink-faint">
          {footer}
        </div>
      )}
      {pagination}
    </div>
  );
}
