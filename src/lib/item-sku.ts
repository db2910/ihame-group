import "server-only";
import { db } from "@/lib/db";

// Phase 2 decision (see backlog.md): SKUs are auto-suggested but editable.
// A hardware shop often carries a supplier's or manufacturer's own code, and
// forcing our sequence onto those items would mean the catalogue no longer
// matches the paperwork it's reconciled against. So the form pre-fills the
// next sequential SKU and the manager can overwrite it; uniqueness is
// enforced either way (unique index on items.sku).
const SKU_PREFIX = "ITM";

async function nextItemSkuSequence(): Promise<number> {
  const latest = await db.item.findFirst({
    where: { sku: { startsWith: `${SKU_PREFIX}-` } },
    orderBy: { sku: "desc" },
    select: { sku: true },
  });
  const latestSeq = latest ? Number.parseInt(latest.sku.split("-")[1] ?? "0", 10) : 0;
  return Number.isFinite(latestSeq) ? latestSeq : 0;
}

export async function generateItemSku(): Promise<string> {
  const next = (await nextItemSkuSequence()) + 1;
  return `${SKU_PREFIX}-${String(next).padStart(4, "0")}`;
}

// For bulk import: allocates `count` sequential codes in one go (one query,
// not one per row) for whichever rows left the SKU column blank.
export async function generateItemSkus(count: number): Promise<string[]> {
  const start = (await nextItemSkuSequence()) + 1;
  return Array.from({ length: count }, (_, i) => `${SKU_PREFIX}-${String(start + i).padStart(4, "0")}`);
}
