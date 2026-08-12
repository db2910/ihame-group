import Link from "next/link";
import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { paidTotalByOrder } from "@/lib/order-balance";
import { Prisma } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";
import { StaffTopBar } from "@/components/shell/staff-top-bar";
import { FREIGHT_STAFF_TABS } from "@/components/shell/staff-tabs";
import { OrdersStatusBar, type OrdersStatusFilter } from "./orders-status-bar";
import { OrdersSearch } from "./orders-search";
import { OrdersTable, type OrderRow } from "./orders-table";
import { formatMoney, STATUS_LABEL } from "./format";

const date = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const ALL_STATUSES: OrderStatus[] = ["draft", "submitted", "in_transit", "arrived", "delivered", "cancelled"];

export default async function MyOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireRole(["freight_staff"]);
  const params = await searchParams;
  const statusParam = params.status;
  const status: OrdersStatusFilter =
    statusParam && (ALL_STATUSES as string[]).includes(statusParam) ? (statusParam as OrderStatus) : "all";
  const query = params.q?.trim();

  // Spec §5 "Staff API scope: created_by = auth user — other staff's drafts
  // never returned, at the query level" — applied here for every status, not
  // just drafts: a freight staff member's My-orders list is entirely their
  // own, full stop.
  const orders = await db.order.findMany({
    where: {
      createdById: user.id,
      ...(status !== "all" ? { status } : {}),
      ...(query
        ? {
            OR: [
              { orderNo: { contains: query, mode: "insensitive" as const } },
              { description: { contains: query, mode: "insensitive" as const } },
              { customer: { name: { contains: query, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const balances = await paidTotalByOrder(orders.map((o) => o.id));

  const rows: OrderRow[] = orders.map((o) => {
    const paid = balances.get(o.id) ?? new Prisma.Decimal(0);
    const balance = o.totalAmount ? o.totalAmount.minus(paid) : null;
    return {
      id: o.id,
      orderNo: o.orderNo,
      customerName: o.customer.name,
      goodsSummary: o.description || (o.goodsCategory ? o.goodsCategory : "—"),
      destinationLabel: o.destination ? o.destination[0].toUpperCase() + o.destination.slice(1) : null,
      etaDisplay: o.eta ? date.format(o.eta).toUpperCase() : null,
      status: o.status,
      balanceDisplay: balance && o.currency ? formatMoney(Number(balance), o.currency) : null,
    };
  });

  return (
    <StaffTopBar role="freight_staff" user={user} tabs={FREIGHT_STAFF_TABS} active="orders">
      <div className="flex items-center justify-between gap-3 border-b border-hairline-2 bg-card px-4.5 py-3.5 md:px-6.5">
        <div>
          <div className="font-sans text-[19px] font-semibold text-ink">My orders</div>
          <div className="mt-0.5 font-sans text-[12px] text-ink-faint">
            Orders you created · drafts are only visible to you
          </div>
        </div>
        <Link
          href="/orders/new"
          className="flex h-11 flex-none cursor-pointer items-center rounded bg-brand px-3.5 font-sans text-[13px] font-medium text-white hover:bg-brand-hover md:h-[34px]"
        >
          + New order
        </Link>
      </div>
      <div className="border-b border-hairline-2 bg-card px-4.5 py-3 md:px-6.5">
        <OrdersSearch />
      </div>
      <OrdersStatusBar status={status} />
      <div className="flex min-h-0 flex-1 flex-col p-4 md:p-6.5">
        <OrdersTable
          orders={rows}
          footer={
            query
              ? `${orders.length} order${orders.length === 1 ? "" : "s"} matching “${query}”`
              : `${orders.length} order${orders.length === 1 ? "" : "s"}${status === "all" ? "" : ` · ${STATUS_LABEL[status].toLowerCase()}`}`
          }
        />
      </div>
    </StaffTopBar>
  );
}
