import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { Currency, Destination, OrderStatus } from "@/generated/prisma/enums";
import { paidTotalByOrder } from "@/lib/order-balance";

/**
 * Manager dashboard / bulk-status metrics (phase 5). Per the currency
 * decision (9 Aug 2026): amounts are never converted between currencies —
 * every total here is grouped and summed per currency and shown as separate
 * figures, never blended into one number.
 *
 * "Today" boundaries use the UTC calendar day, matching this app's one
 * existing convention (see src/app/sale/today/page.tsx's comment) rather
 * than introducing a business-timezone assumption nothing else in the app
 * makes.
 */

const OPEN_ORDER_STATUSES = ["submitted", "in_transit", "arrived", "delivered"] as const;

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export type AwaitingReviewSummary = {
  count: number;
  submittedToday: number;
  oldestDays: number | null;
};

// "Awaiting review" = orders sitting in `submitted`, the one status a
// freight-staff submission lands in before a manager acts on it.
export async function awaitingReviewSummary(): Promise<AwaitingReviewSummary> {
  const rows = await db.order.findMany({
    where: { status: "submitted" },
    select: { submittedAt: true },
    orderBy: { submittedAt: "asc" },
  });

  if (rows.length === 0) return { count: 0, submittedToday: 0, oldestDays: null };

  // Every `submitted` order has submittedAt set — saveOrderAction stamps it
  // in the same write that flips status (src/app/orders/actions.ts) — so the
  // non-null assertions below hold for every row this query can return.
  const oldest = rows[0].submittedAt!;
  const todayStart = startOfTodayUtc();
  const submittedToday = rows.filter((o) => o.submittedAt! >= todayStart).length;
  const oldestDays = Math.floor((Date.now() - oldest.getTime()) / 86_400_000);

  return { count: rows.length, submittedToday, oldestDays };
}

export type ReviewQueueRow = {
  id: string;
  orderNo: string;
  customerName: string;
  destination: Destination | null;
  staffName: string;
  currency: Currency;
  balance: Prisma.Decimal;
  submittedAt: Date;
};

// Feeds both the dashboard's "Awaiting your review" table (submitted only)
// and the bulk status update screen (submitted, in_transit, or arrived —
// whichever bucket is currently selected there) — same shape either way.
export async function queueForStatus(status: OrderStatus): Promise<ReviewQueueRow[]> {
  const orders = await db.order.findMany({
    where: { status },
    include: { customer: { select: { name: true } }, createdBy: { select: { name: true } } },
    orderBy: { submittedAt: "asc" },
  });
  const paid = await paidTotalByOrder(orders.map((o) => o.id));

  return orders.map((o) => {
    const total = o.totalAmount ?? new Prisma.Decimal(0);
    const balance = total.minus(paid.get(o.id) ?? new Prisma.Decimal(0));
    return {
      id: o.id,
      orderNo: o.orderNo,
      customerName: o.customer.name,
      destination: o.destination,
      staffName: o.createdBy.name,
      // submitOrderAction requires currency non-null before status can leave
      // draft, so every `submitted` order has one — the fallback never fires.
      currency: o.currency ?? "USD",
      balance,
      submittedAt: o.submittedAt!,
    };
  });
}

export async function reviewQueue(): Promise<ReviewQueueRow[]> {
  return queueForStatus("submitted");
}

export type CurrencyAmount = { currency: Currency; amount: Prisma.Decimal };

export type OutstandingBalanceSummary = {
  totals: CurrencyAmount[];
  orderCount: number;
  overdueCount: number;
};

// Only orders that have actually left draft carry a real total/balance.
// Cancelled orders are excluded — a cancelled order's balance isn't money
// still expected to arrive.
export async function outstandingBalanceSummary(): Promise<OutstandingBalanceSummary> {
  const orders = await db.order.findMany({
    where: { status: { in: [...OPEN_ORDER_STATUSES] } },
    select: { id: true, totalAmount: true, currency: true, eta: true },
  });
  const paid = await paidTotalByOrder(orders.map((o) => o.id));

  const totalsByCurrency = new Map<Currency, Prisma.Decimal>();
  let orderCount = 0;
  let overdueCount = 0;
  const now = new Date();

  for (const o of orders) {
    const total = o.totalAmount ?? new Prisma.Decimal(0);
    const balance = total.minus(paid.get(o.id) ?? new Prisma.Decimal(0));
    if (balance.lessThanOrEqualTo(0)) continue;

    orderCount++;
    const currency = o.currency ?? "USD";
    totalsByCurrency.set(currency, (totalsByCurrency.get(currency) ?? new Prisma.Decimal(0)).plus(balance));

    // "Overdue" has no dedicated field in the spec or schema — inferred as a
    // balance still open past the order's own ETA, the closest thing the
    // schema has to a due date. An order with no ETA yet can't be overdue.
    if (o.eta && o.eta < now) overdueCount++;
  }

  const totals = [...totalsByCurrency.entries()].map(([currency, amount]) => ({ currency, amount }));
  return { totals, orderCount, overdueCount };
}

export type ArrivalRow = {
  id: string;
  orderNo: string;
  eta: Date;
  description: string | null;
  destination: Destination | null;
  containerNo: string | null;
};

// In transit (or still submitted but already ETA-dated) orders due within
// the window — mirrors the mock's "Arrivals · next 14 days" card.
export async function arrivalsUpcoming(days = 14): Promise<ArrivalRow[]> {
  const start = startOfTodayUtc();
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + days);

  const orders = await db.order.findMany({
    where: { status: { in: ["submitted", "in_transit"] }, eta: { gte: start, lt: end } },
    select: { id: true, orderNo: true, eta: true, description: true, destination: true, containerNo: true },
    orderBy: { eta: "asc" },
  });

  return orders.map((o) => ({ ...o, eta: o.eta! }));
}
