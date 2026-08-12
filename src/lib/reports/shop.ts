import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { Period } from "./shared";

export type DailySales = { date: Date; count: number; revenue: Prisma.Decimal };
export type DailyMonthlySales = { days: DailySales[]; monthTotal: Prisma.Decimal; monthCount: number };

// Report: "Daily & monthly sales" — one row per day within the selected
// month, same bucketing approach as the dashboard's 7-day card
// (src/lib/shop-metrics.ts), just scoped to an arbitrary period instead of a
// fixed trailing window.
export async function dailyMonthlySales(period: Period): Promise<DailyMonthlySales> {
  const sales = await db.sale.findMany({
    where: { isVoided: false, createdAt: { gte: period.start, lt: period.end } },
    select: { total: true, createdAt: true },
  });

  const dayCount = Math.round((period.end.getTime() - period.start.getTime()) / 86_400_000);
  const dayStarts = Array.from({ length: dayCount }, (_, i) => {
    const d = new Date(period.start);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
  const byDay = new Map(dayStarts.map((d) => [d.getTime(), { count: 0, revenue: new Prisma.Decimal(0) }]));

  let monthTotal = new Prisma.Decimal(0);
  for (const sale of sales) {
    monthTotal = monthTotal.plus(sale.total);
    const dayStart = new Date(sale.createdAt);
    dayStart.setUTCHours(0, 0, 0, 0);
    const bucket = byDay.get(dayStart.getTime());
    if (bucket) {
      bucket.count += 1;
      bucket.revenue = bucket.revenue.plus(sale.total);
    }
  }

  return {
    days: dayStarts.map((date) => ({ date, ...byDay.get(date.getTime())! })),
    monthTotal,
    monthCount: sales.length,
  };
}

export type OverallProfit = {
  revenue: Prisma.Decimal;
  purchaseSpend: Prisma.Decimal;
  openingStockCost: Prisma.Decimal;
  profit: Prisma.Decimal;
};

// Report: "Overall profit" — cash-basis (Phase 2/6 decision, 7 Aug 2026):
// sale revenue minus purchase spend minus opening-stock cost, over the
// chosen period. Deliberately not per-item margin — see that decision's own
// caveat about why (weighted-average cost precision vs. a simple, always-
// correctable two-sums figure).
export async function overallProfit(period: Period): Promise<OverallProfit> {
  const [salesResult, purchasesResult, openingRows] = await Promise.all([
    db.sale.aggregate({ where: { isVoided: false, createdAt: { gte: period.start, lt: period.end } }, _sum: { total: true } }),
    db.purchase.aggregate({ where: { purchasedAt: { gte: period.start, lt: period.end } }, _sum: { total: true } }),
    db.stockMovement.findMany({
      where: { movementType: "opening", createdAt: { gte: period.start, lt: period.end } },
      select: { quantity: true, unitCost: true },
    }),
  ]);

  const revenue = salesResult._sum.total ?? new Prisma.Decimal(0);
  const purchaseSpend = purchasesResult._sum.total ?? new Prisma.Decimal(0);
  const openingStockCost = openingRows.reduce(
    (sum, r) => sum.plus(r.quantity.times(r.unitCost ?? new Prisma.Decimal(0))),
    new Prisma.Decimal(0),
  );

  return { revenue, purchaseSpend, openingStockCost, profit: revenue.minus(purchaseSpend).minus(openingStockCost) };
}

export type SlowMoverRow = { itemId: string; sku: string; name: string; lastSaleAt: Date | null; daysSince: number | null };

// Report: "Slow movers" — active items with no non-voided sale in the last
// `days` (default per spec: 60). "Never sold" is its own case, not folded
// into a fake huge day count.
export async function slowMovers(days = 60): Promise<SlowMoverRow[]> {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);

  const items = await db.item.findMany({
    where: { isActive: true },
    select: { id: true, sku: true, name: true },
    orderBy: { name: "asc" },
  });

  // Most recent non-voided sale per item, one query for the whole catalogue
  // rather than N+1 per item.
  const lastSales = await db.saleItem.findMany({
    where: { sale: { isVoided: false } },
    select: { itemId: true, sale: { select: { createdAt: true } } },
    orderBy: { sale: { createdAt: "desc" } },
  });
  const lastSaleByItem = new Map<string, Date>();
  for (const row of lastSales) {
    if (!lastSaleByItem.has(row.itemId)) lastSaleByItem.set(row.itemId, row.sale.createdAt);
  }

  const now = Date.now();
  return items
    .map((item) => {
      const lastSaleAt = lastSaleByItem.get(item.id) ?? null;
      return {
        itemId: item.id,
        sku: item.sku,
        name: item.name,
        lastSaleAt,
        daysSince: lastSaleAt ? Math.floor((now - lastSaleAt.getTime()) / 86_400_000) : null,
      };
    })
    .filter((r) => r.lastSaleAt === null || r.lastSaleAt < cutoff)
    .sort((a, b) => (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity));
}

export type UnderPriceSaleRow = {
  saleId: string;
  saleNo: string;
  at: Date;
  itemName: string;
  sku: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  sellPrice: Prisma.Decimal;
  staffName: string;
};

// Report: "Under-price sales" — every under-price line within the period,
// with the item's *current* sell price shown for context (the line itself
// already snapshotted what was actually charged at sale time, per
// sale_items.is_under_price's own comment — this report doesn't re-derive
// that flag, just lists the lines already carrying it).
export async function underPriceSales(period: Period): Promise<UnderPriceSaleRow[]> {
  const lines = await db.saleItem.findMany({
    where: {
      isUnderPrice: true,
      sale: { isVoided: false, createdAt: { gte: period.start, lt: period.end } },
    },
    select: {
      quantity: true,
      unitPrice: true,
      item: { select: { name: true, sku: true, sellPrice: true } },
      sale: { select: { id: true, saleNo: true, createdAt: true, soldBy: { select: { name: true } } } },
    },
    orderBy: { sale: { createdAt: "desc" } },
  });

  return lines.map((l) => ({
    saleId: l.sale.id,
    saleNo: l.sale.saleNo,
    at: l.sale.createdAt,
    itemName: l.item.name,
    sku: l.item.sku,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    sellPrice: l.item.sellPrice,
    staffName: l.sale.soldBy.name,
  }));
}
