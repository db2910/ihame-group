import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { Currency } from "@/generated/prisma/enums";
import { paidTotalByOrder } from "@/lib/order-balance";
import { outstandingBalanceSummary } from "@/lib/order-metrics";
import { type CurrencyAmount, groupByCurrency, primaryAmountNumber } from "./shared";

const REVENUE_STATUSES = ["submitted", "in_transit", "arrived", "delivered"] as const;

export type MonthlyOrders = { monthKey: string; monthLabel: string; count: number; value: CurrencyAmount[] };

// Report: "Orders per month" — count and value, most recent N months
// (bucketed in JS, same as the dashboard's daily shop-sales card, rather
// than a raw date_trunc query — order volumes here are small enough that
// this stays simple and portable).
export async function ordersPerMonth(months = 12): Promise<MonthlyOrders[]> {
  const end = new Date();
  end.setUTCDate(1);
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCMonth(end.getUTCMonth() + 1); // exclusive upper bound: start of next month
  const start = new Date(end);
  start.setUTCMonth(start.getUTCMonth() - months);

  const orders = await db.order.findMany({
    where: { status: { in: [...REVENUE_STATUSES] }, submittedAt: { gte: start, lt: end } },
    select: { totalAmount: true, currency: true, submittedAt: true },
  });

  const buckets = Array.from({ length: months }, (_, i) => {
    const d = new Date(start);
    d.setUTCMonth(d.getUTCMonth() + i);
    return d;
  });
  const byBucket = new Map<string, { totalAmount: Prisma.Decimal | null; currency: Currency | null }[]>();
  for (const d of buckets) byBucket.set(d.toISOString(), []);

  for (const o of orders) {
    const bucketDate = new Date(Date.UTC(o.submittedAt!.getUTCFullYear(), o.submittedAt!.getUTCMonth(), 1));
    const key = bucketDate.toISOString();
    byBucket.get(key)?.push(o);
  }

  return buckets.map((d) => {
    const rows = byBucket.get(d.toISOString()) ?? [];
    return {
      monthKey: d.toISOString().slice(0, 7),
      monthLabel: d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
      count: rows.length,
      value: groupByCurrency(rows, (r) => r.currency ?? "USD", (r) => r.totalAmount ?? new Prisma.Decimal(0)),
    };
  });
}

export type CustomerBalance = {
  customerId: string;
  customerName: string;
  orderCount: number;
  balances: CurrencyAmount[];
};

// Report: "Outstanding balances by customer" — the same per-order figures
// outstandingBalanceSummary() already computes for the dashboard KPI,
// grouped one level further by customer instead of collapsed to one total.
export async function outstandingBalancesByCustomer(): Promise<CustomerBalance[]> {
  const orders = await db.order.findMany({
    where: { status: { in: [...REVENUE_STATUSES] } },
    select: { id: true, totalAmount: true, currency: true, customerId: true, customer: { select: { name: true } } },
  });
  const paid = await paidTotalByOrder(orders.map((o) => o.id));

  const byCustomer = new Map<string, { name: string; rows: typeof orders }>();
  for (const o of orders) {
    const entry = byCustomer.get(o.customerId) ?? { name: o.customer.name, rows: [] };
    entry.rows.push(o);
    byCustomer.set(o.customerId, entry);
  }

  const result: CustomerBalance[] = [];
  for (const [customerId, { name, rows }] of byCustomer) {
    const owing = rows.filter((o) => {
      const total = o.totalAmount ?? new Prisma.Decimal(0);
      const balance = total.minus(paid.get(o.id) ?? new Prisma.Decimal(0));
      return balance.greaterThan(0);
    });
    if (owing.length === 0) continue;
    const balances = groupByCurrency(
      owing,
      (o) => o.currency ?? "USD",
      (o) => (o.totalAmount ?? new Prisma.Decimal(0)).minus(paid.get(o.id) ?? new Prisma.Decimal(0)),
    );
    result.push({ customerId, customerName: name, orderCount: owing.length, balances });
  }

  return result.sort((a, b) => primaryAmountNumber(b.balances, "USD") - primaryAmountNumber(a.balances, "USD"));
}

export type StaffOrders = { staffId: string; staffName: string; count: number; value: CurrencyAmount[] };

// Report: "Orders per staff member" — volume and value, scoped to the
// selected period (same picker the rest of the strip uses).
export async function ordersPerStaffMember(period: { start: Date; end: Date }): Promise<StaffOrders[]> {
  const orders = await db.order.findMany({
    where: { status: { in: [...REVENUE_STATUSES] }, submittedAt: { gte: period.start, lt: period.end } },
    select: { totalAmount: true, currency: true, createdById: true, createdBy: { select: { name: true } } },
  });

  const byStaff = new Map<string, { name: string; rows: typeof orders }>();
  for (const o of orders) {
    const entry = byStaff.get(o.createdById) ?? { name: o.createdBy.name, rows: [] };
    entry.rows.push(o);
    byStaff.set(o.createdById, entry);
  }

  return [...byStaff.entries()]
    .map(([staffId, { name, rows }]) => ({
      staffId,
      staffName: name,
      count: rows.length,
      value: groupByCurrency(rows, (r) => r.currency ?? "USD", (r) => r.totalAmount ?? new Prisma.Decimal(0)),
    }))
    .sort((a, b) => b.count - a.count);
}

export type TransitTimeRow = { destination: string; avgDays: number; sampleSize: number };

// Report: "Average transit time" — departure -> arrival, by destination.
// All-time (not period-scoped): this is a structural/operational figure,
// not something that resets every month, and restricting it to one month
// would starve it of samples. Only orders that actually have both dates —
// actualArrivalDate is only set once an order reaches "arrived" (Phase 5).
export async function averageTransitTime(): Promise<TransitTimeRow[]> {
  const orders = await db.order.findMany({
    where: { departureDate: { not: null }, actualArrivalDate: { not: null } },
    select: { destination: true, departureDate: true, actualArrivalDate: true },
  });

  const byDestination = new Map<string, number[]>();
  for (const o of orders) {
    const key = o.destination ?? "unknown";
    const days = (o.actualArrivalDate!.getTime() - o.departureDate!.getTime()) / 86_400_000;
    const list = byDestination.get(key) ?? [];
    list.push(days);
    byDestination.set(key, list);
  }

  return [...byDestination.entries()]
    .map(([destination, days]) => ({
      destination: destination[0].toUpperCase() + destination.slice(1),
      avgDays: Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10,
      sampleSize: days.length,
    }))
    .sort((a, b) => b.sampleSize - a.sampleSize);
}

export type TopCustomer = { customerId: string; customerName: string; orderCount: number; value: CurrencyAmount[] };

// Report: "Top customers by value" — all-time (a relationship built up over
// the life of the account, not one month's snapshot).
export async function topCustomersByValue(limit = 10): Promise<TopCustomer[]> {
  const orders = await db.order.findMany({
    where: { status: { in: [...REVENUE_STATUSES] } },
    select: { totalAmount: true, currency: true, customerId: true, customer: { select: { name: true } } },
  });

  const byCustomer = new Map<string, { name: string; rows: typeof orders }>();
  for (const o of orders) {
    const entry = byCustomer.get(o.customerId) ?? { name: o.customer.name, rows: [] };
    entry.rows.push(o);
    byCustomer.set(o.customerId, entry);
  }

  const customerRows = [...byCustomer.entries()].map(([customerId, { name, rows: custRows }]) => ({
    customerId,
    customerName: name,
    orderCount: custRows.length,
    value: groupByCurrency(custRows, (r) => r.currency ?? "USD", (r) => r.totalAmount ?? new Prisma.Decimal(0)),
  }));

  return customerRows
    .sort((a, b) => primaryAmountNumber(b.value, "USD") - primaryAmountNumber(a.value, "USD"))
    .slice(0, limit);
}

// Re-exported for the report registry — "Outstanding balances" (the KPI
// card) and this file's own by-customer breakdown share the same source.
export { outstandingBalanceSummary };
