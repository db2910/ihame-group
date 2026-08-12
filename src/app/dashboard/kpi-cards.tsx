import Link from "next/link";
import type { CurrencyAmount } from "@/lib/order-metrics";
import { formatMoneyShort } from "@/app/orders/format";

function KpiCard({
  label,
  value,
  caption,
  accent,
  href,
}: {
  label: string;
  value: React.ReactNode;
  caption: string;
  accent: "brand" | "alert";
  href?: string;
}) {
  // hover only touches background, never border color — a hover:border-*
  // would win over border-t-alert/brand on the top edge too (same
  // border-color shorthand) and wipe out the accent this card is keyed by.
  const className = `flex h-full flex-col rounded-[5px] border border-t-[3px] border-border bg-card px-5 py-4.5 ${
    accent === "alert" ? "border-t-alert" : "border-t-brand"
  } ${href ? "transition-colors hover:bg-row-hover" : ""}`;

  const content = (
    <>
      <div className="font-sans text-[11.5px] font-medium tracking-[0.05em] text-ink-muted uppercase">{label}</div>
      <div
        className={`mt-2.5 font-mono text-[32px] leading-[1.1] font-semibold md:text-[40px] ${
          accent === "alert" ? "text-alert" : "text-ink"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 font-sans text-[12.5px] leading-[1.4] text-ink-faint">{caption}</div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}

function reviewCaption(submittedToday: number, oldestDays: number | null): string {
  if (oldestDays === null) return "Nothing waiting";
  const oldest = oldestDays === 0 ? "today" : `oldest ${oldestDays} day${oldestDays === 1 ? "" : "s"}`;
  return `${submittedToday} submitted today · ${oldest}`;
}

// "Overdue" is an inferred concept (balance still open past the order's own
// ETA) — see src/lib/order-metrics.ts's outstandingBalanceSummary comment.
function outstandingCaption(orderCount: number, overdueCount: number): string {
  if (orderCount === 0) return "No orders with an outstanding balance";
  const base = `across ${orderCount} order${orderCount === 1 ? "" : "s"}`;
  return overdueCount > 0 ? `${base} · ${overdueCount} overdue` : base;
}

function lowStockCaption(count: number, zeroCount: number): string {
  if (count === 0) return "Nothing below reorder level";
  if (zeroCount === 0) return "None at zero yet";
  return `${zeroCount} item${zeroCount === 1 ? "" : "s"} already at zero`;
}

// Per the currency decision (9 Aug 2026): amounts never convert. One
// currency renders at the mock's full 40px size; more than one stacks each
// currency's own total, smaller, rather than picking one to feature.
function OutstandingValue({ totals }: { totals: CurrencyAmount[] }) {
  if (totals.length === 0) return <>—</>;
  if (totals.length === 1) {
    return <>{formatMoneyShort(Number(totals[0].amount), totals[0].currency)}</>;
  }
  return (
    <div className="flex flex-col gap-0.5">
      {totals.map((t) => (
        <div key={t.currency} className="text-[20px] md:text-[24px]">
          {formatMoneyShort(Number(t.amount), t.currency)}
        </div>
      ))}
    </div>
  );
}

export function DashboardKpis({
  awaitingReview,
  outstanding,
  lowStock,
}: {
  awaitingReview: { count: number; submittedToday: number; oldestDays: number | null };
  outstanding: { totals: CurrencyAmount[]; orderCount: number; overdueCount: number };
  lowStock: { count: number; zeroCount: number };
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4">
      {/* Order differs by breakpoint: mobile mock puts outstanding balances
          on its own full-width row beneath awaiting review + low stock;
          desktop mock runs all three across in a different order. */}
      <div className="order-1">
        <KpiCard
          label="Orders awaiting review"
          value={awaitingReview.count}
          caption={reviewCaption(awaitingReview.submittedToday, awaitingReview.oldestDays)}
          accent="brand"
          href="/bulk-status"
        />
      </div>
      <div className="order-2 md:order-3">
        <KpiCard
          label="Low stock alerts"
          value={lowStock.count}
          caption={lowStockCaption(lowStock.count, lowStock.zeroCount)}
          accent="alert"
          href="/items?status=low"
        />
      </div>
      <div className="order-3 col-span-2 md:order-2 md:col-span-1">
        {/* Not linked yet: "outstanding balance" isn't a filter All orders
            supports (balance is computed at read time, not a column a
            simple where-clause can filter on) — a dead-end link to the
            unfiltered list would be worse than none. */}
        <KpiCard
          label="Outstanding balances"
          value={<OutstandingValue totals={outstanding.totals} />}
          caption={outstandingCaption(outstanding.orderCount, outstanding.overdueCount)}
          accent="brand"
        />
      </div>
    </div>
  );
}
