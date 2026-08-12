import "server-only";
import { db } from "@/lib/db";

// Mirrors src/lib/purchase-no.ts's sequencing.
const SALE_NO_PREFIX = "SAL";

export async function generateSaleNo(): Promise<string> {
  const latest = await db.sale.findFirst({
    where: { saleNo: { startsWith: `${SALE_NO_PREFIX}-` } },
    orderBy: { saleNo: "desc" },
    select: { saleNo: true },
  });

  const latestSeq = latest ? Number.parseInt(latest.saleNo.split("-")[1] ?? "0", 10) : 0;
  const next = (Number.isFinite(latestSeq) ? latestSeq : 0) + 1;
  return `${SALE_NO_PREFIX}-${String(next).padStart(4, "0")}`;
}
