import "server-only";
import { db } from "@/lib/db";

// Phase 0 decision (see backlog.md): the spec's example code "KGL-0412" ties
// the prefix to an order's destination, but a standalone Customers screen
// (this one) has no order/destination context to draw from — a customer
// isn't tied to one destination over their lifetime anyway. We use a fixed
// "KGL" (Kigali, the company's home base) prefix with a running sequence
// instead. Revisit if per-destination prefixes turn out to matter later.
const CODE_PREFIX = "KGL";

export async function generateCustomerCode(): Promise<string> {
  const latest = await db.customer.findFirst({
    where: { code: { startsWith: `${CODE_PREFIX}-` } },
    orderBy: { code: "desc" },
    select: { code: true },
  });

  const latestSeq = latest ? Number.parseInt(latest.code.split("-")[1] ?? "0", 10) : 0;
  const next = (Number.isFinite(latestSeq) ? latestSeq : 0) + 1;
  return `${CODE_PREFIX}-${String(next).padStart(4, "0")}`;
}
