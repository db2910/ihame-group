import Link from "next/link";
import type { ReviewQueueRow } from "@/lib/order-metrics";
import { formatMoneyShort } from "@/app/orders/format";

const GRID = "grid-cols-[1.1fr_1.3fr_.85fr_.85fr_1fr]";
// Mock's own hint count ("Showing 6 of 7") — a dashboard widget is a
// summary, not the full queue; /bulk-status is where the rest lives.
const SHOWN_LIMIT = 6;

function titleCase(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

export function ReviewTable({ rows }: { rows: ReviewQueueRow[] }) {
  const shown = rows.slice(0, SHOWN_LIMIT);

  return (
    <div className="flex flex-col overflow-hidden rounded-[5px] border border-border bg-card">
      <div className="flex items-center justify-between border-b border-hairline-2 px-4.5 py-3">
        <div className="font-sans text-[13.5px] font-semibold text-ink">Awaiting your review</div>
        <Link href="/bulk-status" className="font-sans text-[12px] font-medium text-brand hover:underline">
          Bulk status update →
        </Link>
      </div>

      <div
        className={`hidden ${GRID} gap-2 border-b border-hairline-2 bg-row-hover px-4.5 py-2.5 font-mono text-[10.5px] font-medium tracking-[0.06em] text-ink-faint md:grid`}
      >
        <div>ORDER</div>
        <div>CUSTOMER</div>
        <div>DEST</div>
        <div>STAFF</div>
        <div className="text-right">BALANCE</div>
      </div>

      {rows.length === 0 && (
        <div className="px-4.5 py-8 text-center font-sans text-[14px] text-ink-faint">
          Nothing waiting on review right now.
        </div>
      )}

      {shown.map((r) => (
        <Link key={r.id} href={`/orders/${r.id}`} className="block hover:bg-row-hover">
          <div
            className={`hidden ${GRID} items-center gap-2 border-b border-hairline px-4.5 py-2.75 font-sans text-[13px] text-ink md:grid`}
          >
            <div className="min-w-0 truncate font-mono text-[12.5px]">{r.orderNo}</div>
            <div className="min-w-0 truncate">{r.customerName}</div>
            <div className="min-w-0 truncate text-ink-secondary">
              {r.destination ? titleCase(r.destination) : "—"}
            </div>
            <div className="min-w-0 truncate text-ink-secondary">{r.staffName}</div>
            <div className="text-right font-mono text-[12.5px]">{formatMoneyShort(Number(r.balance), r.currency)}</div>
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-hairline px-4.5 py-3 md:hidden">
            <div className="min-w-0 flex-1">
              <div className="truncate font-sans text-[13.5px] font-medium text-ink">{r.customerName}</div>
              <div className="mt-0.5 truncate font-mono text-[11px] text-ink-faint">
                {r.orderNo} · {r.destination ? titleCase(r.destination) : "—"}
              </div>
            </div>
            <div className="flex-none font-mono text-[12.5px] font-medium text-ink">
              {formatMoneyShort(Number(r.balance), r.currency)}
            </div>
          </div>
        </Link>
      ))}

      {rows.length > 0 && (
        <div className="mt-auto border-t border-hairline px-4.5 py-2.75 font-sans text-[12.5px] text-ink-faint">
          Showing {shown.length} of {rows.length}
        </div>
      )}
    </div>
  );
}
