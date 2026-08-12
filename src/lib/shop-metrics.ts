import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

// Dashboard's "Shop sales" card: a day-over-day trend, not an hour-by-hour
// breakdown of today alone (9 Aug 2026 correction — the first build showed
// hourly bars within today, which is a poor fit for a glance-at-the-trend
// card). "Today" boundaries use the UTC calendar day, same convention as
// src/app/sale/today/page.tsx.
const DAYS_WINDOW = 7;

export type RecentShopSales = {
  total: Prisma.Decimal;
  dailyTotals: { date: Date; total: Prisma.Decimal }[];
  // Count of *sales* with at least one under-price line, not raw flagged
  // lines, across the whole window — matches the mock's original wording
  // ("N under-price sales flagged"), not "N under-price lines".
  underPriceCount: number;
};

export async function recentShopSales(days = DAYS_WINDOW): Promise<RecentShopSales> {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() + 1); // exclusive upper bound: start of tomorrow
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);

  const sales = await db.sale.findMany({
    where: { createdAt: { gte: start, lt: end }, isVoided: false },
    select: { total: true, createdAt: true, items: { select: { isUnderPrice: true } } },
  });

  const dayStarts = Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
  const totalsByDay = new Map(dayStarts.map((d) => [d.getTime(), new Prisma.Decimal(0)]));

  let total = new Prisma.Decimal(0);
  let underPriceCount = 0;
  for (const sale of sales) {
    total = total.plus(sale.total);
    const dayStart = new Date(sale.createdAt);
    dayStart.setUTCHours(0, 0, 0, 0);
    const key = dayStart.getTime();
    const existing = totalsByDay.get(key);
    if (existing) totalsByDay.set(key, existing.plus(sale.total));
    if (sale.items.some((i) => i.isUnderPrice)) underPriceCount++;
  }

  return {
    total,
    dailyTotals: dayStarts.map((date) => ({ date, total: totalsByDay.get(date.getTime())! })),
    underPriceCount,
  };
}
