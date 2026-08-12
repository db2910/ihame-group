import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { paidTotalByOrder } from "@/lib/order-balance";
import { readPagination } from "@/lib/pagination";
import { ManagerShellFrame } from "@/components/shell/manager-shell-frame";
import { ContentHeader } from "@/components/shell/content-header";
import { Pagination } from "@/components/ui/pagination";
import { OrdersTable, type OrderRow } from "@/app/orders/orders-table";
import { formatMoney } from "@/app/orders/format";
import { AllOrdersFilters } from "./all-orders-filters";
import { AllOrdersExportLink } from "./export-link";
import { buildAllOrdersWhere } from "./filters";

const date = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

export default async function AllOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const manager = await requireRole(["manager"]);
  const params = await searchParams;
  const { page, perPage } = readPagination(params);
  const where = buildAllOrdersWhere(params);

  const [orders, total, staffMembers] = await Promise.all([
    db.order.findMany({
      where,
      include: { customer: { select: { name: true } }, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.order.count({ where }),
    db.user.findMany({ where: { role: "freight_staff" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

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
      staffName: o.createdBy.name,
      etaDisplay: o.eta ? date.format(o.eta).toUpperCase() : null,
      status: o.status,
      balanceDisplay: balance && o.currency ? formatMoney(Number(balance), o.currency) : null,
    };
  });

  return (
    <ManagerShellFrame active="all-orders" user={manager}>
      <ContentHeader
        title="All orders"
        subtitle={`${total} order${total === 1 ? "" : "s"} across every staff member`}
        right={<AllOrdersExportLink />}
      />
      <AllOrdersFilters staffOptions={staffMembers} />
      <div className="flex min-h-0 flex-1 flex-col p-4 md:p-6.5">
        <OrdersTable
          orders={rows}
          showStaff
          pagination={<Pagination page={page} perPage={perPage} total={total} />}
        />
      </div>
    </ManagerShellFrame>
  );
}
