import { Prisma } from "@/generated/prisma/client";
import type { Destination, OrderStatus } from "@/generated/prisma/enums";

export const ALL_STATUSES: OrderStatus[] = ["draft", "submitted", "in_transit", "arrived", "delivered", "cancelled"];
export const ALL_DESTINATIONS: Destination[] = ["kigali", "goma", "bukavu"];

// Same "YYYY-MM-DD as UTC midnight" convention as orders/actions.ts's
// parseDateOnly — that one lives in a "use server" module, which can only
// export async functions, so it isn't importable here.
function parseDateParam(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Shared between the page (paginated view) and the CSV export route (every
// matching row, unpaginated) — one definition of "what these filters mean"
// so exported data can never drift from what's actually on screen.
export function buildAllOrdersWhere(params: Record<string, string | undefined>): Prisma.OrderWhereInput {
  const status =
    params.status && (ALL_STATUSES as string[]).includes(params.status) ? (params.status as OrderStatus) : undefined;
  const destination =
    params.dest && (ALL_DESTINATIONS as string[]).includes(params.dest) ? (params.dest as Destination) : undefined;
  const staffId = params.staff?.trim() || undefined;
  const query = params.q?.trim();
  const fromDate = parseDateParam(params.from);
  const toDate = parseDateParam(params.to);
  // Inclusive end date: "to 9 Aug" should still catch orders created any
  // time on the 9th, not just at UTC midnight.
  const toExclusive = toDate ? new Date(toDate.getTime() + 24 * 60 * 60 * 1000) : null;

  return {
    ...(status ? { status } : {}),
    ...(destination ? { destination } : {}),
    ...(staffId ? { createdById: staffId } : {}),
    ...(fromDate || toExclusive
      ? { createdAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toExclusive ? { lt: toExclusive } : {}) } }
      : {}),
    ...(query
      ? {
          OR: [
            { orderNo: { contains: query, mode: "insensitive" as const } },
            { description: { contains: query, mode: "insensitive" as const } },
            { customer: { name: { contains: query, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
}
