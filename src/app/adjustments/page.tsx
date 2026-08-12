import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { ManagerShellFrame } from "@/components/shell/manager-shell-frame";
import { ContentHeader } from "@/components/shell/content-header";
import { Pagination } from "@/components/ui/pagination";
import { readPagination } from "@/lib/pagination";
import { AddAdjustmentModal } from "./adjustment-form-modal";
import { AdjustmentsTable, type AdjustmentRow } from "./adjustments-table";

const quantity = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function fmtWhen(at: Date): string {
  return at
    .toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })
    .toUpperCase()
    .replace(",", "");
}

export default async function AdjustmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const manager = await requireRole(["manager"]);
  const params = await searchParams;
  const { page, perPage } = readPagination(params);

  const where = { movementType: "adjustment" as const };

  const [movements, total, items] = await Promise.all([
    db.stockMovement.findMany({
      where,
      include: { item: { select: { sku: true, name: true } }, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.stockMovement.count({ where }),
    db.item.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, sku: true, name: true, unit: true },
    }),
  ]);

  const rows: AdjustmentRow[] = movements.map((m) => {
    const qty = Number(m.quantity);
    return {
      id: m.id,
      when: fmtWhen(m.createdAt),
      itemName: m.item.name,
      itemSku: m.item.sku,
      quantityDisplay: `${qty >= 0 ? "+" : "−"}${quantity.format(Math.abs(qty))}`,
      isPositive: qty >= 0,
      reason: m.note ?? "—",
      by: m.createdBy.name,
    };
  });

  const itemOptions = items.map((i) => ({ id: i.id, sku: i.sku, name: i.name, unit: i.unit }));

  return (
    <ManagerShellFrame active="adjustments" user={manager}>
      <ContentHeader
        title="Adjustments"
        subtitle="Manual corrections to stock on hand — damage, loss, count variance"
        right={<AddAdjustmentModal items={itemOptions} />}
      />
      <div className="flex min-h-0 flex-1 flex-col p-6.5">
        <AdjustmentsTable
          adjustments={rows}
          pagination={<Pagination page={page} perPage={perPage} total={total} />}
        />
      </div>
    </ManagerShellFrame>
  );
}
