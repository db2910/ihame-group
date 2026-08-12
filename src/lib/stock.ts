import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

/**
 * Stock on hand is never stored (spec §4): it is always
 * `SUM(stock_movements.quantity)` for an item, computed at read time. These
 * helpers are the only place that sum is expressed, so no screen can drift
 * into caching or second-guessing it.
 */

// One aggregate query for the whole catalogue — the Items grid needs an
// on-hand figure per row, and doing that per item would be N+1.
export async function stockOnHandByItem(): Promise<Map<string, Prisma.Decimal>> {
  const rows = await db.stockMovement.groupBy({
    by: ["itemId"],
    _sum: { quantity: true },
  });
  return new Map(rows.map((r) => [r.itemId, r._sum.quantity ?? new Prisma.Decimal(0)]));
}

export async function stockOnHand(itemId: string): Promise<Prisma.Decimal> {
  const result = await db.stockMovement.aggregate({
    where: { itemId },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? new Prisma.Decimal(0);
}

export type LowStockSummary = { ids: string[]; count: number; zeroCount: number };

// Self-contained equivalent of the low-stock computation src/app/items/page.tsx
// does inline (it already has onHandByItem loaded for other reasons, so it
// isn't worth it there) — for callers like the dashboard KPI and sidebar
// badge that only need the counts, not a full items grid.
export async function lowStockSummary(): Promise<LowStockSummary> {
  const [onHandByItem, activeItems] = await Promise.all([
    stockOnHandByItem(),
    db.item.findMany({ where: { isActive: true }, select: { id: true, reorderLevel: true } }),
  ]);

  let zeroCount = 0;
  const ids = activeItems
    .filter((i) => {
      const onHand = onHandByItem.get(i.id) ?? new Prisma.Decimal(0);
      if (onHand.lessThanOrEqualTo(0)) zeroCount++;
      return onHand.lessThanOrEqualTo(i.reorderLevel);
    })
    .map((i) => i.id);

  return { ids, count: ids.length, zeroCount };
}

/**
 * `cost_price` is last-purchase-price, not a running blend: whatever the
 * item's most recent purchase (or its opening entry, if nothing's been
 * bought since) cost per unit. Recomputed by looking the ledger up fresh
 * rather than carried forward from a prior value, so editing or removing a
 * purchase line always lands on the correct number with no historical state
 * to keep in sync — see backlog.md's costing-model note (7 Aug 2026) for why
 * this replaced a weighted-average that made purchase corrections require
 * reconstructing history.
 *
 * `tx` accepts a transaction client so callers can read-then-write the same
 * item inside one `$transaction`.
 */
export async function recomputeCostPrice(
  tx: Prisma.TransactionClient,
  itemId: string,
): Promise<Prisma.Decimal> {
  const latest = await tx.stockMovement.findFirst({
    where: { itemId, movementType: { in: ["opening", "purchase"] } },
    orderBy: { createdAt: "desc" },
    select: { unitCost: true },
  });
  return latest?.unitCost ?? new Prisma.Decimal(0);
}
