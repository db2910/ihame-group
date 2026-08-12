import "server-only";
import { db } from "@/lib/db";

// Spec example: "ORD-2026-0087" — year-scoped sequence, unlike purchase-no's
// flat one. Sequence resets each calendar year (matches the example's shape).
export async function generateOrderNo(): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `ORD-${year}-`;

  const latest = await db.order.findFirst({
    where: { orderNo: { startsWith: prefix } },
    orderBy: { orderNo: "desc" },
    select: { orderNo: true },
  });

  const latestSeq = latest ? Number.parseInt(latest.orderNo.slice(prefix.length), 10) : 0;
  const next = (Number.isFinite(latestSeq) ? latestSeq : 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}
