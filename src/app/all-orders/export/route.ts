import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { paidTotalByOrder } from "@/lib/order-balance";
import { toCsv } from "@/lib/csv";
import { buildAllOrdersWhere } from "../filters";

const date = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

// Every row matching the current filters, not just the current page — a CSV
// export is a full dump of "what I filtered to", not a print of one screen.
export async function GET(request: NextRequest) {
  await requireRole(["manager"]);

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const where = buildAllOrdersWhere(params);

  const orders = await db.order.findMany({
    where,
    include: { customer: { select: { name: true } }, createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const balances = await paidTotalByOrder(orders.map((o) => o.id));

  const rows: (string | number)[][] = [
    ["Order", "Customer", "Goods", "Destination", "Staff", "ETA", "Status", "Currency", "Total", "Paid", "Balance"],
    ...orders.map((o) => {
      const paid = balances.get(o.id) ?? new Prisma.Decimal(0);
      const total = o.totalAmount;
      const balance = total ? total.minus(paid) : null;
      return [
        o.orderNo,
        o.customer.name,
        o.description || o.goodsCategory || "",
        o.destination ? o.destination[0].toUpperCase() + o.destination.slice(1) : "",
        o.createdBy.name,
        o.eta ? date.format(o.eta) : "",
        o.status,
        o.currency ?? "",
        total ? total.toFixed(2) : "",
        total ? paid.toFixed(2) : "",
        balance ? balance.toFixed(2) : "",
      ];
    }),
  ];

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="all-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
