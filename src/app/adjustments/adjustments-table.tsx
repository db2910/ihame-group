export type AdjustmentRow = {
  id: string;
  when: string;
  itemName: string;
  itemSku: string;
  quantityDisplay: string;
  isPositive: boolean;
  reason: string;
  by: string;
};

// Matches the spec's §6.5b grid: WHEN · ITEM · QTY (right, signed) · REASON
// · BY. No row click — unlike Purchases, the spec never calls for a detail
// view here, and there's nothing behind the row a plain list doesn't already
// show (one line item per adjustment, not several).
export const GRID = "grid-cols-[1fr_1.6fr_.6fr_2fr_1fr]";

export function AdjustmentsTable({
  adjustments,
  pagination,
}: {
  adjustments: AdjustmentRow[];
  pagination?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[5px] border border-border bg-card">
      <div
        className={`hidden ${GRID} gap-2 border-b border-hairline-2 bg-row-hover px-4.5 py-2.5 font-mono text-[10.5px] font-medium tracking-[0.06em] text-ink-faint md:grid`}
      >
        <div>WHEN</div>
        <div>ITEM</div>
        <div className="text-right">QTY</div>
        <div>REASON</div>
        <div>BY</div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {adjustments.length === 0 && (
          <div className="px-4.5 py-8 text-center font-sans text-[13px] text-ink-faint">
            No adjustments yet. Record the first one above.
          </div>
        )}
        {adjustments.map((a) => (
          <div
            key={a.id}
            className="border-b border-hairline px-4.5 py-3 font-sans text-[13px] text-ink last:border-b-0"
          >
            {/* Desktop: the spec's 5-column grid. */}
            <div className={`hidden ${GRID} items-start gap-2 md:grid`}>
              <div className="font-mono text-xs text-ink-secondary">{a.when}</div>
              <div className="min-w-0">
                <div className="truncate">{a.itemName}</div>
                <div className="truncate font-mono text-[11px] text-ink-faint">{a.itemSku}</div>
              </div>
              <div
                className={`text-right font-mono text-xs font-semibold ${
                  a.isPositive ? "text-success" : "text-alert"
                }`}
              >
                {a.quantityDisplay}
              </div>
              <div className="text-ink-secondary">{a.reason}</div>
              <div className="truncate text-ink-secondary">{a.by}</div>
            </div>

            {/* Phone: item/qty as a header line, reason and when/by below —
                same "stack it" shape as the rest of the shop screens. */}
            <div className="md:hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{a.itemName}</div>
                  <div className="mt-0.5 truncate font-mono text-[11px] text-ink-faint">
                    {a.itemSku} · {a.when}
                  </div>
                </div>
                <div
                  className={`flex-none font-mono text-[15px] font-semibold ${
                    a.isPositive ? "text-success" : "text-alert"
                  }`}
                >
                  {a.quantityDisplay}
                </div>
              </div>
              <div className="mt-1.5 font-sans text-[12.5px] text-ink-secondary">{a.reason}</div>
              <div className="mt-1 font-mono text-[10.5px] text-ink-faint">{a.by}</div>
            </div>
          </div>
        ))}
      </div>

      {pagination}
    </div>
  );
}
