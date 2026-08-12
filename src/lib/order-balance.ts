import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

/**
 * An order's balance is never stored (spec §4): it is always
 * `total_amount − SUM(order_payments.amount)`, computed at read time. This is
 * a literal sum of raw payment amounts — no currency conversion — matching
 * the spec's formula exactly. A payment's `exchangeRate` is recorded per
 * payment purely for later reporting (spec §7's combined report), not applied
 * here; the UI defaults a payment's currency to the order's own currency to
 * keep mismatches rare.
 */

export async function orderBalance(orderId: string, totalAmount: Prisma.Decimal): Promise<Prisma.Decimal> {
  const result = await db.orderPayment.aggregate({
    where: { orderId },
    _sum: { amount: true },
  });
  return totalAmount.minus(result._sum.amount ?? new Prisma.Decimal(0));
}

// One aggregate query for a list of orders — a My-orders/All-orders grid
// needs a balance per row, and doing that per order would be N+1.
export async function paidTotalByOrder(orderIds: string[]): Promise<Map<string, Prisma.Decimal>> {
  if (orderIds.length === 0) return new Map();
  const rows = await db.orderPayment.groupBy({
    by: ["orderId"],
    where: { orderId: { in: orderIds } },
    _sum: { amount: true },
  });
  return new Map(rows.map((r) => [r.orderId, r._sum.amount ?? new Prisma.Decimal(0)]));
}
