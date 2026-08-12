import "server-only";
import { db } from "@/lib/db";

// Mirrors src/lib/item-sku.ts's sequencing: pre-filled, not enforced — a
// manager can overwrite it, uniqueness comes from the DB index either way.
const PURCHASE_NO_PREFIX = "PO";

export async function generatePurchaseNo(): Promise<string> {
  const latest = await db.purchase.findFirst({
    where: { purchaseNo: { startsWith: `${PURCHASE_NO_PREFIX}-` } },
    orderBy: { purchaseNo: "desc" },
    select: { purchaseNo: true },
  });

  const latestSeq = latest ? Number.parseInt(latest.purchaseNo.split("-")[1] ?? "0", 10) : 0;
  const next = (Number.isFinite(latestSeq) ? latestSeq : 0) + 1;
  return `${PURCHASE_NO_PREFIX}-${String(next).padStart(4, "0")}`;
}
