import { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { stockOnHandByItem } from "@/lib/stock";
import { ManagerShellFrame } from "@/components/shell/manager-shell-frame";
import { ContentHeader } from "@/components/shell/content-header";
import { Pagination } from "@/components/ui/pagination";
import { readPagination } from "@/lib/pagination";
import { AddItemModal } from "./item-form-modal";
import { ItemsSearch } from "./items-search";
import { ItemsTable, type ItemRow } from "./items-table";
import { ItemsStatusBar, LowStockBanner, type ItemsStatus } from "./items-status-bar";

// Shop figures are RWF (Phase 0 decision). The schema stores 2 decimals, so
// show them rather than quietly rounding away a purchase's actual unit cost.
const money = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const quantity = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const manager = await requireRole(["manager"]);
  const params = await searchParams;
  const query = params.q?.trim();
  const { page, perPage } = readPagination(params);
  const status: ItemsStatus =
    params.status === "low" || params.status === "inactive" ? params.status : "all";

  // Stock on hand isn't a column — "low stock" can't be expressed as a plain
  // `where` clause, so the low-stock id set is computed here (once, whole
  // catalogue) and reused for both the "Low stock · N" pill/banner count and,
  // when that filter is actually selected, as an `id IN (...)` constraint on
  // the paginated query below.
  const [onHandByItem, activeItemsForLowCount] = await Promise.all([
    stockOnHandByItem(),
    db.item.findMany({ where: { isActive: true }, select: { id: true, reorderLevel: true } }),
  ]);
  const lowIds = activeItemsForLowCount
    .filter((i) => (onHandByItem.get(i.id) ?? new Prisma.Decimal(0)).lessThanOrEqualTo(i.reorderLevel))
    .map((i) => i.id);
  const lowCount = lowIds.length;

  const searchWhere = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { sku: { contains: query, mode: "insensitive" as const } },
          { barcode: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};
  const statusWhere =
    status === "low" ? { id: { in: lowIds } } : status === "inactive" ? { isActive: false } : {};
  const where = { AND: [searchWhere, statusWhere] };

  const [items, matchCount, categories] = await Promise.all([
    db.item.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.item.count({ where }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const rows: ItemRow[] = items.map((item) => {
    const onHand = onHandByItem.get(item.id) ?? new Prisma.Decimal(0);
    return {
      id: item.id,
      sku: item.sku,
      barcode: item.barcode,
      name: item.name,
      categoryId: item.categoryId,
      categoryName: item.category.name,
      unit: item.unit,
      costPrice: money.format(Number(item.costPrice)),
      sellPrice: item.sellPrice.toFixed(2),
      // Reorder level is a quantity, not currency — same formatter as
      // on-hand rather than a forced-2-decimal money style.
      reorderLevel: quantity.format(Number(item.reorderLevel)),
      onHand: quantity.format(Number(onHand)),
      isActive: item.isActive,
      // Only meaningful for items still being sold — an inactive item sitting
      // under its reorder level isn't something to act on.
      isLow: item.isActive && onHand.lessThanOrEqualTo(item.reorderLevel),
    };
  });

  const scopeLabel = status === "low" ? "low-stock" : status === "inactive" ? "inactive" : null;
  const subtitle = query
    ? `${matchCount} item${matchCount === 1 ? "" : "s"} matching “${query}”${scopeLabel ? ` · ${scopeLabel}` : ""}`
    : scopeLabel
      ? `${matchCount} ${scopeLabel} item${matchCount === 1 ? "" : "s"}`
      : `${matchCount} item${matchCount === 1 ? "" : "s"} · ${lowCount} below reorder level`;

  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name }));
  const lowStockHref = query ? `/items?status=low&q=${encodeURIComponent(query)}` : "/items?status=low";

  return (
    <ManagerShellFrame active={status === "low" ? "low-stock" : "items"} user={manager}>
      <ContentHeader
        title="Items"
        subtitle={subtitle}
        right={
          <>
            <ItemsSearch />
            <AddItemModal categories={categoryOptions} />
          </>
        }
      />
      {status === "all" && <LowStockBanner count={lowCount} href={lowStockHref} />}
      <ItemsStatusBar status={status} query={query} perPage={perPage} lowCount={lowCount} />
      <div className="flex min-h-0 flex-1 flex-col p-6.5">
        <ItemsTable
          items={rows}
          categories={categoryOptions}
          pagination={<Pagination page={page} perPage={perPage} total={matchCount} />}
        />
      </div>
    </ManagerShellFrame>
  );
}
