import { Prisma } from "@/generated/prisma/client";
import { formatMoneyShort } from "@/app/orders/format";

const dayAbbrev = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
const dayTooltip = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", timeZone: "UTC" });

export function ShopSalesCard({
  total,
  dailyTotals,
  underPriceCount,
}: {
  total: Prisma.Decimal;
  dailyTotals: { date: Date; total: Prisma.Decimal }[];
  underPriceCount: number;
}) {
  const max = dailyTotals.reduce((m, d) => (d.total.greaterThan(m) ? d.total : m), new Prisma.Decimal(0));
  const maxNum = Number(max);

  return (
    <div className="flex flex-1 flex-col rounded-[5px] border border-border bg-card p-4.5">
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-sans text-[13.5px] font-semibold text-ink">Shop sales · last {dailyTotals.length} days</div>
        <div className="font-mono text-[15px] font-semibold text-ink">{formatMoneyShort(Number(total), "RWF")}</div>
      </div>
      <div className="mt-3.5 flex h-[74px] items-end gap-2">
        {dailyTotals.map((d, i) => {
          // A floor of 4% keeps every bar visible (a zero-sales day reads as
          // a real bar, not a gap that looks like missing data).
          const pct = maxNum > 0 ? Math.max(4, Math.round((Number(d.total) / maxNum) * 100)) : 4;
          return (
            <div
              key={i}
              title={`${dayTooltip.format(d.date)} — ${formatMoneyShort(Number(d.total), "RWF")}`}
              className="flex-1 rounded-[1px] bg-accent hover:bg-brand"
              style={{ height: `${pct}%` }}
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10.5px] text-ink-faint">
        {dailyTotals.map((d, i) => (
          <span key={i}>{dayAbbrev.format(d.date)}</span>
        ))}
      </div>
      <div className="mt-3.5 flex items-center gap-2.5 border-t border-hairline-2 pt-3">
        <span
          aria-hidden="true"
          className={`h-[7px] w-[7px] flex-none rounded-full ${underPriceCount > 0 ? "bg-alert" : "bg-ink-disabled"}`}
        />
        <span className="font-sans text-[12.5px] text-ink-secondary">
          {underPriceCount > 0
            ? `${underPriceCount} under-price sale${underPriceCount === 1 ? "" : "s"} flagged this week`
            : "No under-price sales flagged this week"}
        </span>
      </div>
    </div>
  );
}
