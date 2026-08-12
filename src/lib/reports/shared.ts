import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Currency } from "@/generated/prisma/enums";
import type { CurrencyAmount } from "@/lib/order-metrics";

export type { CurrencyAmount };

/**
 * Phase 6 reports. Per the currency decision (9 Aug 2026, Phase 5): money is
 * never converted or blended — every figure that could span more than one
 * currency is grouped and summed per currency instead, same convention
 * order-metrics.ts already established for the dashboard.
 */

// [start, end) in UTC — matches this app's one existing timezone convention
// (see order-metrics.ts / sale/today's own comments) rather than assuming a
// business-local timezone nothing else in the app assumes.
export type Period = { start: Date; end: Date };

export function monthPeriod(year: number, month1To12: number): Period {
  const start = new Date(Date.UTC(year, month1To12 - 1, 1));
  const end = new Date(Date.UTC(year, month1To12, 1));
  return { start, end };
}

export function currentMonthPeriod(): Period {
  const now = new Date();
  return monthPeriod(now.getUTCFullYear(), now.getUTCMonth() + 1);
}

export function monthLabel(period: Period): string {
  return period.start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

// Reads ?year=&month= (both required to override the default) into a Period
// — shared by the landing page, the report detail page, and both of their
// export routes, so a stale/malformed query string falls back the same way
// everywhere instead of four slightly different parsers drifting apart.
export function periodFromParams(params: Record<string, string | undefined> | URLSearchParams): Period {
  const get = (key: string) => (params instanceof URLSearchParams ? params.get(key) : (params[key] ?? null));
  const year = Number(get("year"));
  const month = Number(get("month"));
  if (Number.isInteger(year) && year > 2000 && Number.isInteger(month) && month >= 1 && month <= 12) {
    return monthPeriod(year, month);
  }
  return currentMonthPeriod();
}

// The query string every report-related link/export carries so the picked
// month survives navigation between the landing page and a report's detail.
export function periodQueryString(period: Period): string {
  return `year=${period.start.getUTCFullYear()}&month=${period.start.getUTCMonth() + 1}`;
}

export function groupByCurrency<T>(
  rows: T[],
  getCurrency: (row: T) => Currency,
  getAmount: (row: T) => Prisma.Decimal,
): CurrencyAmount[] {
  const totals = new Map<Currency, Prisma.Decimal>();
  for (const row of rows) {
    const currency = getCurrency(row);
    totals.set(currency, (totals.get(currency) ?? new Prisma.Decimal(0)).plus(getAmount(row)));
  }
  return [...totals.entries()].map(([currency, amount]) => ({ currency, amount }));
}

export function mergeCurrencyAmounts(...groups: CurrencyAmount[][]): CurrencyAmount[] {
  const totals = new Map<Currency, Prisma.Decimal>();
  for (const group of groups) {
    for (const { currency, amount } of group) {
      totals.set(currency, (totals.get(currency) ?? new Prisma.Decimal(0)).plus(amount));
    }
  }
  return [...totals.entries()].map(([currency, amount]) => ({ currency, amount }));
}

// A "by customer"/"top customers" list still needs *some* deterministic
// order, and sorting by a summed-across-currencies number would be exactly
// the kind of blend the currency decision rejects (10,000 RWF would
// outrank $500 on raw face value). Instead this ranks by whichever currency
// is that module's normal settlement currency (USD for freight, RWF for
// shop — the Phase 0 default), with every other currency still shown in
// full, just not used to decide the order.
export function primaryAmountNumber(totals: CurrencyAmount[], primary: Currency): number {
  return Number(totals.find((t) => t.currency === primary)?.amount ?? 0);
}

// A table cell can only hold one string — this is the one place a grouped
// CurrencyAmount[] collapses to text, joined (not summed) so a genuinely
// mixed-currency row still shows every figure rather than picking one.
export function formatCurrencyAmounts(amounts: CurrencyAmount[]): string {
  if (amounts.length === 0) return "—";
  return amounts
    .map((a) => `${a.currency} ${Number(a.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    .join(" · ");
}

export const reportDate = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
