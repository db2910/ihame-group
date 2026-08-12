import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { outstandingBalanceSummary, type OutstandingBalanceSummary } from "@/lib/order-metrics";
import { type Period, type CurrencyAmount, groupByCurrency, mergeCurrencyAmounts } from "./shared";

// Orders that actually represent committed business, not a still-blank draft
// or a cancelled one — same set order-metrics.ts's outstanding-balance
// summary already treats as "real".
const REVENUE_STATUSES = ["submitted", "in_transit", "arrived", "delivered"] as const;

// Reports summary strip, card 1: value of orders raised in the period —
// scoped to submittedAt, since a draft was never actually raised as
// business. Cancelled orders are excluded (see REVENUE_STATUSES).
export async function freightRevenue(period: Period): Promise<CurrencyAmount[]> {
  const orders = await db.order.findMany({
    where: { status: { in: [...REVENUE_STATUSES] }, submittedAt: { gte: period.start, lt: period.end } },
    select: { totalAmount: true, currency: true },
  });
  return groupByCurrency(orders, (o) => o.currency ?? "USD", (o) => o.totalAmount ?? new Prisma.Decimal(0));
}

// Card 2: shop sales have no currency column at all (Phase 0: shop always
// trades in RWF) — a plain Decimal, not a CurrencyAmount[], since there is
// never more than one currency to group.
export async function shopRevenue(period: Period): Promise<Prisma.Decimal> {
  const result = await db.sale.aggregate({
    where: { isVoided: false, createdAt: { gte: period.start, lt: period.end } },
    _sum: { total: true },
  });
  return result._sum.total ?? new Prisma.Decimal(0);
}

// Card 3: "Total cash in" — a genuinely different figure from revenue above.
// Revenue is orders/sales *raised* in the period (accrual-ish); this is
// money actually *received* in the period (cash-basis) — freight payments
// recorded against `paidOn`, plus completed shop sales (a non-voided sale is
// itself the cash-in event). The mock's own version of this card converts
// everything to one blended number ("converted at rate per payment") — per
// the currency decision that's dropped; this groups per currency instead,
// same as every other cross-module figure on this page.
export async function totalCashIn(period: Period): Promise<CurrencyAmount[]> {
  const [payments, shopTotal] = await Promise.all([
    db.orderPayment.findMany({
      where: { paidOn: { gte: period.start, lt: period.end } },
      select: { amount: true, currency: true },
    }),
    shopRevenue(period),
  ]);
  const freightCashIn = groupByCurrency(payments, (p) => p.currency, (p) => p.amount);
  // Only folded in when non-zero — a quiet shop period shouldn't manufacture
  // a "RWF 0" line that didn't come from any real currency grouping above.
  const shopCashIn: CurrencyAmount[] = shopTotal.greaterThan(0) ? [{ currency: "RWF", amount: shopTotal }] : [];
  return mergeCurrencyAmounts(freightCashIn, shopCashIn);
}

// Card 4: point-in-time, not period-scoped — "how much is currently owed"
// doesn't reset every month. Reuses Phase 5's dashboard figure directly
// rather than recomputing the same query a second way.
export async function receivables(): Promise<OutstandingBalanceSummary> {
  return outstandingBalanceSummary();
}
