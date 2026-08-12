import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import type { OutstandingBalanceSummary } from "@/lib/order-metrics";
import type { CurrencyAmount } from "@/lib/reports/shared";
import { formatMoneyShort } from "@/app/orders/format";

function CurrencyLines({ amounts }: { amounts: CurrencyAmount[] }) {
  if (amounts.length === 0) return <span className="text-ink-faint">—</span>;
  return (
    <div className="flex flex-col gap-0.5">
      {amounts.map((a) => (
        <span key={a.currency}>{formatMoneyShort(Number(a.amount), a.currency)}</span>
      ))}
    </div>
  );
}

const ACCENT_BORDER: Record<string, string> = {
  brand: "border-t-brand",
  accent: "border-t-accent",
  dark: "border-t-dark",
  alert: "border-t-alert",
};

function Card({
  label,
  value,
  caption,
  accent,
  href,
}: {
  label: string;
  value: React.ReactNode;
  caption: string;
  accent: "brand" | "accent" | "dark" | "alert";
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`flex h-full flex-col rounded-[5px] border border-t-[3px] border-border bg-card px-5 py-4.5 transition-colors hover:bg-row-hover ${ACCENT_BORDER[accent]}`}
    >
      <div className="font-sans text-[11.5px] font-medium tracking-[0.05em] text-ink-muted uppercase">{label}</div>
      <div className="mt-2.5 font-mono text-[22px] leading-[1.15] font-semibold text-ink md:text-[26px]">{value}</div>
      <div className="mt-1 font-sans text-[12px] leading-[1.4] text-ink-faint">{caption}</div>
    </Link>
  );
}

// Reports summary strip, per the mock: Freight revenue / Shop revenue /
// Total cash in / Receivables. Every card here links straight into the
// report it summarizes, same "click the number, see the detail" pattern the
// dashboard's own KPI cards already use.
export function ReportKpiStrip({
  freightRevenue,
  shopRevenue,
  cashIn,
  receivables,
  periodQuery,
}: {
  freightRevenue: CurrencyAmount[];
  shopRevenue: Prisma.Decimal;
  cashIn: CurrencyAmount[];
  receivables: OutstandingBalanceSummary;
  periodQuery: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3.5">
      <Card
        label="Freight revenue"
        value={<CurrencyLines amounts={freightRevenue} />}
        caption="orders raised this period"
        accent="brand"
        href={`/reports/orders-per-month?${periodQuery}`}
      />
      <Card
        label="Shop revenue"
        value={formatMoneyShort(Number(shopRevenue), "RWF")}
        caption="sales this period"
        accent="accent"
        href={`/reports/daily-monthly-sales?${periodQuery}`}
      />
      <Card
        label="Total cash in"
        value={<CurrencyLines amounts={cashIn} />}
        caption="payments received this period"
        accent="dark"
        href={`/reports/monthly-summary?${periodQuery}`}
      />
      <Card
        label="Receivables"
        value={<CurrencyLines amounts={receivables.totals} />}
        // Deliberately not "this period" like the other three cards — this
        // figure is always as-of-today (see kpis.ts's receivables()), so a
        // payment made after the selected month can shrink it below what
        // "this period's revenue minus this period's cash in" implies. The
        // caption says so explicitly rather than leaving that to be inferred
        // from a mismatch that otherwise looks like missing money.
        caption={`${receivables.orderCount} order${receivables.orderCount === 1 ? "" : "s"} outstanding, as of today`}
        accent="alert"
        href={`/reports/outstanding-balances?${periodQuery}`}
      />
    </div>
  );
}
