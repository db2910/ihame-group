import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { Currency } from "@/generated/prisma/enums";
import { freightRevenue, shopRevenue, totalCashIn, receivables } from "./kpis";
import { type Period, type CurrencyAmount, groupByCurrency } from "./shared";

export type MonthlySummary = {
  freightRevenue: CurrencyAmount[];
  shopRevenue: Prisma.Decimal;
  cashIn: CurrencyAmount[];
  receivables: CurrencyAmount[];
};

// Report: "Monthly summary" — the same 4 KPI-strip figures, packaged as the
// combined report the mock's own "Combined" group promises. Receivables is
// still point-in-time (see kpis.ts) — a monthly summary reads it as "as of
// now", not as a figure that resets each period.
export async function monthlySummary(period: Period): Promise<MonthlySummary> {
  const [freight, shop, cashIn, owed] = await Promise.all([
    freightRevenue(period),
    shopRevenue(period),
    totalCashIn(period),
    receivables(),
  ]);
  return { freightRevenue: freight, shopRevenue: shop, cashIn, receivables: owed.totals };
}

const REVENUE_STATUSES = ["submitted", "in_transit", "arrived", "delivered"] as const;

export type StaffActivityRow =
  | { staffId: string; staffName: string; module: "freight"; count: number; value: CurrencyAmount[] }
  | { staffId: string; staffName: string; module: "shop"; count: number; value: Prisma.Decimal };

// Report: "Sales per staff member (both modules)" — a freight staff member's
// activity is measured in orders raised, a shop staff member's in sales
// rung up. Listed together on one roster rather than summed into one number
// per person — freight orders and shop sales aren't even the same kind of
// event, before currency is considered at all.
export async function salesPerStaffMember(period: Period): Promise<StaffActivityRow[]> {
  const [orders, sales] = await Promise.all([
    db.order.findMany({
      where: { status: { in: [...REVENUE_STATUSES] }, submittedAt: { gte: period.start, lt: period.end } },
      select: { totalAmount: true, currency: true, createdById: true, createdBy: { select: { name: true } } },
    }),
    db.sale.findMany({
      where: { isVoided: false, createdAt: { gte: period.start, lt: period.end } },
      select: { total: true, soldById: true, soldBy: { select: { name: true } } },
    }),
  ]);

  const byFreightStaff = new Map<string, { name: string; rows: typeof orders }>();
  for (const o of orders) {
    const entry = byFreightStaff.get(o.createdById) ?? { name: o.createdBy.name, rows: [] };
    entry.rows.push(o);
    byFreightStaff.set(o.createdById, entry);
  }
  const freightRows: StaffActivityRow[] = [...byFreightStaff.entries()].map(([staffId, { name, rows }]) => ({
    staffId,
    staffName: name,
    module: "freight",
    count: rows.length,
    value: groupByCurrency(rows, (r) => r.currency ?? "USD", (r) => r.totalAmount ?? new Prisma.Decimal(0)),
  }));

  const byShopStaff = new Map<string, { name: string; total: Prisma.Decimal; count: number }>();
  for (const s of sales) {
    const entry = byShopStaff.get(s.soldById) ?? { name: s.soldBy.name, total: new Prisma.Decimal(0), count: 0 };
    entry.total = entry.total.plus(s.total);
    entry.count += 1;
    byShopStaff.set(s.soldById, entry);
  }
  const shopRows: StaffActivityRow[] = [...byShopStaff.entries()].map(([staffId, { name, total, count }]) => ({
    staffId,
    staffName: name,
    module: "shop",
    count,
    value: total,
  }));

  return [...freightRows, ...shopRows].sort((a, b) => b.count - a.count);
}

export type ExchangeRateRow = {
  paymentId: string;
  orderNo: string;
  paidOn: Date;
  amount: Prisma.Decimal;
  currency: Currency;
  exchangeRate: Prisma.Decimal;
  recordedBy: string;
};

// Report: "Exchange rate impact" — reframed per the 9 Aug currency scope
// decision (see backlog.md's Phase 6 note). The mock's original version
// converts every payment into one blended figure ("converted at rate per
// payment"); that's dropped. What's left, and is actually useful: every
// payment's recorded rate, so a manager can spot-check that the number
// typed in at entry time was sane — not a cross-currency comparison.
export async function exchangeRateImpact(period: Period): Promise<ExchangeRateRow[]> {
  const payments = await db.orderPayment.findMany({
    where: { paidOn: { gte: period.start, lt: period.end } },
    select: {
      id: true,
      amount: true,
      currency: true,
      exchangeRate: true,
      paidOn: true,
      order: { select: { orderNo: true } },
      recordedBy: { select: { name: true } },
    },
    orderBy: { paidOn: "desc" },
  });

  return payments.map((p) => ({
    paymentId: p.id,
    orderNo: p.order.orderNo,
    paidOn: p.paidOn,
    amount: p.amount,
    currency: p.currency,
    exchangeRate: p.exchangeRate,
    recordedBy: p.recordedBy.name,
  }));
}
