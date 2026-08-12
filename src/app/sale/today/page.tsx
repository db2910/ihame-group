import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { ManagerShellFrame } from "@/components/shell/manager-shell-frame";
import { StaffTopBar } from "@/components/shell/staff-top-bar";
import { SHOP_STAFF_TABS } from "@/components/shell/staff-tabs";
import { ContentHeader } from "@/components/shell/content-header";
import { SalesTable, type SaleRow } from "./sales-table";

const PAYMENT_LABEL: Record<string, string> = { cash: "Cash", momo: "MoMo", bank: "Bank", card: "Card" };
const quantity = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function fmtWhen(at: Date): string {
  return at
    .toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })
    .toUpperCase()
    .replace(",", "");
}

export default async function TodaysSalesPage() {
  // Shared between manager (review + void) and shop staff (their own day's
  // till, read-only) — same "one screen, role-appropriate chrome and
  // actions" pattern as /customers, rather than two separate pages.
  const user = await requireRole(["manager", "shop_staff"]);
  const canVoid = user.role === "manager";

  // "Today" is the UTC calendar day, matching this app's one existing
  // date-boundary convention (purchases' explicit UTC parsing) rather than
  // introducing a new, undocumented business-timezone assumption — see
  // src/app/purchases/actions.ts's parsePurchaseDate comment for why local
  // server time was rejected as a boundary basis.
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const sales = await db.sale.findMany({
    where: { createdAt: { gte: start, lt: end } },
    include: {
      items: { include: { item: { select: { sku: true, name: true, unit: true } } } },
      soldBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows: SaleRow[] = sales.map((s) => ({
    id: s.id,
    saleNo: s.saleNo,
    when: fmtWhen(s.createdAt),
    itemCount: s.items.length,
    total: `RWF ${Number(s.total).toLocaleString("en-US")}`,
    paymentMethod: PAYMENT_LABEL[s.paymentMethod] ?? s.paymentMethod,
    hasProofOfPayment: s.proofOfPaymentPath !== null,
    soldBy: s.soldBy.name,
    isVoided: s.isVoided,
    voidReason: s.voidReason,
    lines: s.items.map((li) => ({
      id: li.id,
      itemName: li.item.name,
      itemSku: li.item.sku,
      unit: li.item.unit,
      quantityDisplay: quantity.format(Number(li.quantity)),
      unitPriceDisplay: `RWF ${Number(li.unitPrice).toLocaleString("en-US")}`,
      lineTotalDisplay: `RWF ${(Number(li.unitPrice) * Number(li.quantity)).toLocaleString("en-US")}`,
      isUnderPrice: li.isUnderPrice,
    })),
  }));

  const activeCount = rows.filter((r) => !r.isVoided).length;

  const body = (
    <>
      <ContentHeader
        title="Today's sales"
        subtitle={`${activeCount} sale${activeCount === 1 ? "" : "s"} today${rows.length !== activeCount ? ` · ${rows.length - activeCount} voided` : ""}`}
      />
      <div className="flex min-h-0 flex-1 flex-col p-6.5">
        <SalesTable sales={rows} canVoid={canVoid} />
      </div>
    </>
  );

  if (user.role === "manager") {
    return (
      <ManagerShellFrame active="sales" user={user}>
        {body}
      </ManagerShellFrame>
    );
  }

  return (
    <StaffTopBar role="shop_staff" user={user} tabs={SHOP_STAFF_TABS} active="today">
      {body}
    </StaffTopBar>
  );
}
