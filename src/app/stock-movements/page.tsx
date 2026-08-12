import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import type { MovementType } from "@/generated/prisma/enums";
import { ManagerShellFrame } from "@/components/shell/manager-shell-frame";
import { ContentHeader } from "@/components/shell/content-header";
import { Pagination } from "@/components/ui/pagination";
import { readPagination } from "@/lib/pagination";

const MOVEMENT_TYPES: MovementType[] = ["opening", "purchase", "sale", "return", "damage", "adjustment"];

const quantity = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function fmtWhen(at: Date): string {
  return at
    .toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })
    .toUpperCase()
    .replace(",", "");
}

// text-base (16px), not text-[Npx], on mobile — iOS Safari force-zooms the
// viewport when a focused select/input renders under 16px. Same convention
// as the Audit log filter row.
const selectClass =
  "h-11 md:h-[34px] rounded border border-input-border bg-card px-3 font-sans text-base md:text-[13.5px] text-ink-secondary";

const GRID = "grid-cols-[1fr_1.4fr_.8fr_.7fr_1.7fr_.9fr]";

export default async function StockMovementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const manager = await requireRole(["manager"]);
  const params = await searchParams;
  const { page, perPage } = readPagination(params);

  const itemId = params.item || undefined;
  const movementType =
    params.type && MOVEMENT_TYPES.includes(params.type as MovementType) ? (params.type as MovementType) : undefined;
  const from = params.from ? new Date(`${params.from}T00:00:00Z`) : undefined;
  const to = params.to ? new Date(`${params.to}T23:59:59Z`) : undefined;

  const where = {
    ...(itemId ? { itemId } : {}),
    ...(movementType ? { movementType } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };

  const [movements, total, items] = await Promise.all([
    db.stockMovement.findMany({
      where,
      include: { item: { select: { sku: true, name: true, unit: true } }, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.stockMovement.count({ where }),
    db.item.findMany({ orderBy: { name: "asc" }, select: { id: true, sku: true, name: true } }),
  ]);

  // Purchase- and sale/return-type rows reference their header record by id
  // (reference_type/reference_id — a loose pointer, not a FK, since it spans
  // several tables per the schema comment). Batched into one lookup per
  // table rather than one query per row.
  const purchaseIds = movements
    .filter((m) => m.movementType === "purchase" && m.referenceId)
    .map((m) => m.referenceId!);
  const saleIds = movements
    .filter((m) => (m.movementType === "sale" || m.movementType === "return") && m.referenceId)
    .map((m) => m.referenceId!);

  const [purchases, sales] = await Promise.all([
    purchaseIds.length > 0
      ? db.purchase.findMany({ where: { id: { in: purchaseIds } }, select: { id: true, purchaseNo: true } })
      : Promise.resolve([]),
    saleIds.length > 0
      ? db.sale.findMany({ where: { id: { in: saleIds } }, select: { id: true, saleNo: true } })
      : Promise.resolve([]),
  ]);
  const purchaseNoById = new Map(purchases.map((p) => [p.id, p.purchaseNo]));
  const saleNoById = new Map(sales.map((s) => [s.id, s.saleNo]));

  function detailFor(m: (typeof movements)[number]): string {
    if (m.movementType === "purchase" && m.referenceId) {
      return purchaseNoById.get(m.referenceId) ?? "—";
    }
    if (m.movementType === "sale" && m.referenceId) {
      return saleNoById.get(m.referenceId) ?? "—";
    }
    if (m.movementType === "return" && m.referenceId) {
      const saleNo = saleNoById.get(m.referenceId);
      return saleNo ? `Void of ${saleNo}` : "—";
    }
    if (m.note) return m.note;
    if (m.movementType === "opening") return "Initial stock";
    return "—";
  }

  return (
    <ManagerShellFrame active="stock-movements" user={manager}>
      <ContentHeader
        title="Stock movements"
        subtitle="Every stock change — opening, purchases, sales, adjustments — in one ledger"
      />
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-6.5">
        {/* Wraps on mobile rather than overflowing — same reasoning as the
            Audit log filter row: five 16px-tall (iOS zoom fix) controls in
            one unwrapped row only fit past a desktop width. */}
        <form className="flex flex-wrap gap-2.5" method="get">
          <select name="item" defaultValue={itemId ?? ""} className={selectClass}>
            <option value="">All items</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.sku} — {i.name}
              </option>
            ))}
          </select>
          <select name="type" defaultValue={movementType ?? ""} className={selectClass}>
            <option value="">All types</option>
            {MOVEMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input type="date" name="from" defaultValue={params.from ?? ""} className={selectClass} />
          <input type="date" name="to" defaultValue={params.to ?? ""} className={selectClass} />
          <button
            type="submit"
            className="h-11 cursor-pointer rounded bg-dark px-3.5 font-sans text-base font-medium text-white md:h-[34px] md:text-[13.5px]"
          >
            Filter
          </button>
        </form>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[5px] border border-border bg-card">
          <div
            className={`hidden ${GRID} gap-2 border-b border-hairline-2 bg-row-hover px-4.5 py-2.5 font-mono text-[11.5px] font-medium tracking-[0.06em] text-ink-faint md:grid`}
          >
            <div>WHEN</div>
            <div>ITEM</div>
            <div>TYPE</div>
            <div className="text-right">QTY</div>
            <div>DETAIL</div>
            <div>BY</div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {movements.length === 0 && (
              <div className="px-4.5 py-8 text-center font-sans text-[15px] text-ink-faint">
                No stock movements match these filters.
              </div>
            )}
            {movements.map((m) => {
              const qty = Number(m.quantity);
              const qtyDisplay = `${qty >= 0 ? "+" : "−"}${quantity.format(Math.abs(qty))}`;
              return (
                <div
                  key={m.id}
                  className="border-b border-hairline px-4.5 py-3 font-sans text-[12.5px] text-ink last:border-b-0 md:text-[14px]"
                >
                  {/* Desktop: the 6-column grid. */}
                  <div className={`hidden ${GRID} items-center gap-2 md:grid`}>
                    <div className="min-w-0 font-mono text-[12.5px] text-ink-secondary">{fmtWhen(m.createdAt)}</div>
                    <div className="min-w-0">
                      <div className="truncate">{m.item.name}</div>
                      <div className="truncate font-mono text-[12px] text-ink-faint">{m.item.sku}</div>
                    </div>
                    <div className="min-w-0 truncate font-mono text-[12.5px] text-ink-faint">{m.movementType}</div>
                    <div
                      className={`text-right font-mono text-[13.5px] font-semibold ${
                        qty >= 0 ? "text-success" : "text-alert"
                      }`}
                    >
                      {qtyDisplay}
                    </div>
                    <div className="min-w-0 truncate font-mono text-[12.5px] text-brand">{detailFor(m)}</div>
                    <div className="min-w-0 truncate text-ink-secondary">{m.createdBy.name}</div>
                  </div>

                  {/* Phone: same dense grid as Audit log rather than a card —
                      this is a read-only ledger row, not something with
                      per-row actions that need thumb-sized targets. */}
                  <div className="grid grid-cols-[1fr_.7fr] items-start gap-2 md:hidden">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{m.item.name}</div>
                      <div className="mt-0.5 truncate font-mono text-[11.5px] text-ink-faint">
                        {m.item.sku} · {m.movementType} · {fmtWhen(m.createdAt)}
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[11.5px] text-brand">{detailFor(m)}</div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-mono text-[14px] font-semibold ${qty >= 0 ? "text-success" : "text-alert"}`}
                      >
                        {qtyDisplay}
                      </div>
                      <div className="mt-0.5 truncate font-sans text-[11.5px] text-ink-faint">{m.createdBy.name}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination page={page} perPage={perPage} total={total} />
        </div>
      </div>
    </ManagerShellFrame>
  );
}
