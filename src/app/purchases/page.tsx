import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { ManagerShellFrame } from "@/components/shell/manager-shell-frame";
import { ContentHeader } from "@/components/shell/content-header";
import { Pagination } from "@/components/ui/pagination";
import { readPagination } from "@/lib/pagination";
import { RecordPurchaseModal, type ItemOption } from "./purchase-form-modal";
import { PurchasesTable, type PurchaseRow } from "./purchases-table";

// Shop figures are RWF (Phase 0 decision) — same formatters as /items.
const money = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const quantity = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
// timeZone: "UTC" — purchasedAt is stored as a UTC-midnight calendar date
// (see parsePurchaseDate in actions.ts); formatting in the server's local
// timezone instead could roll it back to the previous day.
const date = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const manager = await requireRole(["manager"]);
  const params = await searchParams;
  const { page, perPage } = readPagination(params);

  const [purchases, total, suppliers, activeItems] = await Promise.all([
    db.purchase.findMany({
      include: {
        supplier: { select: { name: true } },
        createdBy: { select: { name: true } },
        lines: { include: { item: { select: { sku: true, name: true, unit: true, isActive: true } } } },
      },
      orderBy: { purchasedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.purchase.count(),
    db.supplier.findMany({ orderBy: { name: "asc" } }),
    db.item.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, sku: true, name: true, unit: true },
    }),
  ]);

  const rows: PurchaseRow[] = purchases.map((p) => ({
    id: p.id,
    purchaseNo: p.purchaseNo,
    supplierId: p.supplierId,
    supplierName: p.supplier.name,
    purchasedAtIso: p.purchasedAt.toISOString().slice(0, 10),
    purchasedAtDisplay: date.format(p.purchasedAt).toUpperCase(),
    lineCount: p.lines.length,
    totalDisplay: money.format(Number(p.total)),
    recordedBy: p.createdBy.name,
    lines: p.lines.map((l) => ({
      id: l.id,
      itemId: l.itemId,
      itemName: l.item.name,
      itemSku: l.item.sku,
      unit: l.item.unit,
      quantity: l.quantity.toFixed(2),
      quantityDisplay: quantity.format(Number(l.quantity)),
      unitCost: l.unitCost.toFixed(2),
      unitCostDisplay: money.format(Number(l.unitCost)),
      lineTotalDisplay: money.format(Number(l.quantity) * Number(l.unitCost)),
    })),
  }));

  // The edit form's item picker needs every item any line on this page
  // actually references, even a since-deactivated one — otherwise opening
  // "Edit" on an old purchase would silently drop a line's item because it's
  // missing from the <select>'s options.
  const itemOptionsById = new Map<string, ItemOption>(activeItems.map((i) => [i.id, i]));
  for (const p of purchases) {
    for (const l of p.lines) {
      if (!itemOptionsById.has(l.itemId)) {
        itemOptionsById.set(l.itemId, { id: l.itemId, sku: l.item.sku, name: l.item.name, unit: l.item.unit });
      }
    }
  }
  const itemOptions = [...itemOptionsById.values()];

  const supplierOptions = suppliers.map((s) => ({ id: s.id, name: s.name }));

  return (
    <ManagerShellFrame active="purchases" user={manager}>
      <ContentHeader
        title="Purchases"
        subtitle={`${total} purchase${total === 1 ? "" : "s"} · cost follows the most recent purchase for each item`}
        right={<RecordPurchaseModal suppliers={supplierOptions} items={activeItems} />}
      />
      <div className="flex min-h-0 flex-1 flex-col p-6.5">
        <PurchasesTable
          purchases={rows}
          suppliers={supplierOptions}
          items={itemOptions}
          pagination={<Pagination page={page} perPage={perPage} total={total} />}
        />
      </div>
    </ManagerShellFrame>
  );
}
