"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/dal";
import { recomputeCostPrice } from "@/lib/stock";
import { recordAuditChanges } from "@/lib/audit";
import { generatePurchaseNo } from "@/lib/purchase-no";
import { uniqueConstraintFields } from "@/lib/prisma-errors";

const decimalString = (label: string, { min = 0 }: { min?: number } = {}) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), `${label} must be a number with at most 2 decimals.`)
    .refine((v) => Number(v) >= min, `${label} cannot be less than ${min}.`);

const purchaseSchema = z.object({
  purchaseNo: z.string().trim().min(1, "Purchase number is required.").max(40, "Purchase number is too long."),
  supplierId: z.string().trim().min(1, "Supplier is required."),
  newSupplierName: z.string().trim().optional(),
  purchasedAt: z.string().trim().min(1, "Purchase date is required."),
});

const lineSchema = z.object({
  itemId: z.string().trim().min(1),
  quantity: decimalString("Quantity", { min: 0.01 }),
  unitCost: decimalString("Unit cost"),
});

export type PurchaseFormState = { error: string } | { success: true } | undefined;

// The supplier select carries this sentinel when the manager chose "+ New
// supplier…" — same inline-creation pattern as items' category field.
const NEW_SUPPLIER = "__new__";

async function resolveSupplier(
  supplierId: string,
  newSupplierName: string | undefined,
): Promise<{ id: string; name: string } | { error: string }> {
  if (supplierId !== NEW_SUPPLIER) {
    const existing = await db.supplier.findUnique({ where: { id: supplierId }, select: { id: true, name: true } });
    if (!existing) return { error: "Select a supplier." };
    return existing;
  }

  const name = newSupplierName?.trim();
  if (!name) return { error: "Enter a name for the new supplier." };

  const supplier = await db.supplier.upsert({
    where: { name },
    update: {},
    create: { name },
  });
  return { id: supplier.id, name: supplier.name };
}

type LineDraft = { itemId: string; quantity: string; unitCost: string };
// `lineId` is the existing purchase_items row this line came from — present
// only when editing. Absent/null means "new line", used by updatePurchaseAction.
type EditLineDraft = LineDraft & { lineId: string | null };

function readLines(
  formData: FormData,
  { withLineId }: { withLineId: boolean },
): { lines: EditLineDraft[] } | { error: string } {
  const lineIds = formData.getAll("lineId").map(String);
  const itemIds = formData.getAll("itemId").map(String);
  const quantities = formData.getAll("quantity").map(String);
  const unitCosts = formData.getAll("unitCost").map(String);

  const rows = itemIds.map((itemId, i) => ({
    lineId: withLineId ? lineIds[i] || null : null,
    itemId,
    quantity: quantities[i] ?? "",
    unitCost: unitCosts[i] ?? "",
  }));

  // A row can only go blank if the catalogue itself was empty when the form
  // rendered — the client component always seeds a row with the first item
  // selected. Filtered out here rather than trusted, since this is the last
  // stop before it's treated as real stock.
  const nonEmpty = rows.filter((r) => r.itemId && (r.quantity.trim() || r.unitCost.trim()));

  if (nonEmpty.length === 0) {
    return { error: "Add at least one line." };
  }

  const parsedLines: EditLineDraft[] = [];
  for (const row of nonEmpty) {
    const parsed = lineSchema.safeParse(row);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid line." };
    }
    parsedLines.push({ ...parsed.data, lineId: row.lineId });
  }
  return { lines: parsedLines };
}

function readPurchaseHeader(formData: FormData) {
  return purchaseSchema.safeParse({
    purchaseNo: formData.get("purchaseNo"),
    supplierId: formData.get("supplierId"),
    newSupplierName: formData.get("newSupplierName")?.toString().trim() || undefined,
    purchasedAt: formData.get("purchasedAt"),
  });
}

function lineTotal(quantity: string, unitCost: string): Prisma.Decimal {
  return new Prisma.Decimal(quantity).times(unitCost).toDecimalPlaces(2);
}

// A purchase date is a plain calendar date, no meaningful time-of-day —
// parsed as UTC midnight, not local midnight on whatever timezone the server
// happens to run in. Parsing as local time and later reading it back out
// with toISOString().slice(0, 10) (UTC, in purchasedAtIso below) is exactly
// how a date would silently shift by a day on every edit.
function parsePurchaseDate(value: string): Date | null {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createPurchaseAction(
  _prevState: PurchaseFormState,
  formData: FormData,
): Promise<PurchaseFormState> {
  // Spec §2: only the manager manages purchases and stock.
  const user = await requireRole(["manager"]);

  const parsed = readPurchaseHeader(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const purchasedAt = parsePurchaseDate(data.purchasedAt);
  if (!purchasedAt) {
    return { error: "Enter a valid purchase date." };
  }

  const supplier = await resolveSupplier(data.supplierId, data.newSupplierName);
  if ("error" in supplier) return { error: supplier.error };

  const linesResult = readLines(formData, { withLineId: false });
  if ("error" in linesResult) return { error: linesResult.error };
  const lines = linesResult.lines;

  try {
    await db.$transaction(async (tx) => {
      let total = new Prisma.Decimal(0);
      for (const line of lines) total = total.plus(lineTotal(line.quantity, line.unitCost));

      const purchase = await tx.purchase.create({
        data: {
          purchaseNo: data.purchaseNo,
          supplierId: supplier.id,
          purchasedAt,
          total,
          createdById: user.id,
        },
      });

      for (const line of lines) {
        const quantity = new Prisma.Decimal(line.quantity);
        const unitCost = new Prisma.Decimal(line.unitCost);

        const purchaseItem = await tx.purchaseItem.create({
          data: { purchaseId: purchase.id, itemId: line.itemId, quantity, unitCost },
        });

        await tx.stockMovement.create({
          data: {
            itemId: line.itemId,
            movementType: "purchase",
            quantity,
            unitCost,
            referenceType: "purchase",
            referenceId: purchase.id,
            purchaseItemId: purchaseItem.id,
            createdById: user.id,
            // "Most recent purchase" (recomputeCostPrice) has to mean most
            // recent by the date the manager entered, not by whichever
            // purchase happened to get typed into the system first — matters
            // as soon as anyone backdates or enters paperwork out of order.
            createdAt: purchasedAt,
          },
        });

        await tx.item.update({
          where: { id: line.itemId },
          data: { costPrice: await recomputeCostPrice(tx, line.itemId) },
        });
      }
    });
  } catch (err) {
    return { error: uniqueConstraintMessage(err) ?? "Could not save the purchase." };
  }

  revalidatePath("/purchases");
  revalidatePath("/items");
  return { success: true };
}

// Purchases are editable (manager only) — see the model comment on
// PurchaseItem in schema.prisma for why this is safe now: cost_price is
// last-purchase-price, recomputed fresh from the ledger, not a value that
// compounds across purchases the way a weighted average would.
export async function updatePurchaseAction(
  _prevState: PurchaseFormState,
  formData: FormData,
): Promise<PurchaseFormState> {
  const user = await requireRole(["manager"]);
  const purchaseId = String(formData.get("purchaseId") ?? "");

  const parsed = readPurchaseHeader(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const purchasedAt = parsePurchaseDate(data.purchasedAt);
  if (!purchasedAt) {
    return { error: "Enter a valid purchase date." };
  }

  const supplier = await resolveSupplier(data.supplierId, data.newSupplierName);
  if ("error" in supplier) return { error: supplier.error };

  const linesResult = readLines(formData, { withLineId: true });
  if ("error" in linesResult) return { error: linesResult.error };
  const lines = linesResult.lines;

  const existing = await db.purchase.findUnique({
    where: { id: purchaseId },
    include: { lines: true, supplier: { select: { name: true } } },
  });
  if (!existing) return { error: "That purchase no longer exists." };

  const existingLineById = new Map(existing.lines.map((l) => [l.id, l]));

  try {
    await db.$transaction(async (tx) => {
      let total = new Prisma.Decimal(0);
      for (const line of lines) total = total.plus(lineTotal(line.quantity, line.unitCost));

      await tx.purchase.update({
        where: { id: purchaseId },
        data: { purchaseNo: data.purchaseNo, supplierId: supplier.id, purchasedAt, total },
      });

      const submittedIds = new Set(lines.filter((l) => l.lineId).map((l) => l.lineId!));
      const affectedItemIds = new Set<string>();

      // Lines the manager deleted from the form — remove the ledger row
      // first (it holds the FK), then the purchase line itself.
      for (const removedLine of existing.lines.filter((l) => !submittedIds.has(l.id))) {
        await tx.stockMovement.deleteMany({ where: { purchaseItemId: removedLine.id } });
        await tx.purchaseItem.delete({ where: { id: removedLine.id } });
        affectedItemIds.add(removedLine.itemId);
      }

      for (const line of lines) {
        const quantity = new Prisma.Decimal(line.quantity);
        const unitCost = new Prisma.Decimal(line.unitCost);
        affectedItemIds.add(line.itemId);

        if (line.lineId) {
          const before = existingLineById.get(line.lineId);
          if (before) affectedItemIds.add(before.itemId); // item itself may have changed

          await tx.purchaseItem.update({
            where: { id: line.lineId },
            data: { itemId: line.itemId, quantity, unitCost },
          });
          const updated = await tx.stockMovement.updateMany({
            where: { purchaseItemId: line.lineId },
            // Re-stamped to the (possibly just-changed) purchase date for the
            // same reason createPurchaseAction sets it: "most recent
            // purchase" has to track the chosen business date, not entry order.
            data: { itemId: line.itemId, quantity, unitCost, createdAt: purchasedAt },
          });
          if (updated.count !== 1) {
            throw new Error("Could not find the ledger entry for an existing line.");
          }
        } else {
          const purchaseItem = await tx.purchaseItem.create({
            data: { purchaseId, itemId: line.itemId, quantity, unitCost },
          });
          await tx.stockMovement.create({
            data: {
              itemId: line.itemId,
              movementType: "purchase",
              quantity,
              unitCost,
              referenceType: "purchase",
              referenceId: purchaseId,
              purchaseItemId: purchaseItem.id,
              createdById: user.id,
              createdAt: purchasedAt,
            },
          });
        }
      }

      for (const itemId of affectedItemIds) {
        await tx.item.update({
          where: { id: itemId },
          data: { costPrice: await recomputeCostPrice(tx, itemId) },
        });
      }

      await recordAuditChanges({
        tableName: "purchases",
        recordId: purchaseId,
        changedById: user.id,
        before: {
          purchase_no: existing.purchaseNo,
          supplier: existing.supplier.name,
          purchased_at: existing.purchasedAt.toISOString().slice(0, 10),
          total: existing.total.toFixed(2),
          lines: String(existing.lines.length),
        },
        after: {
          purchase_no: data.purchaseNo,
          supplier: supplier.name,
          purchased_at: data.purchasedAt,
          total: total.toFixed(2),
          lines: String(lines.length),
        },
      });
    });
  } catch (err) {
    return { error: uniqueConstraintMessage(err) ?? "Could not save the purchase." };
  }

  revalidatePath("/purchases");
  revalidatePath("/items");
  return { success: true };
}

export async function suggestPurchaseNoAction(): Promise<string> {
  await requireRole(["manager"]);
  return generatePurchaseNo();
}

function uniqueConstraintMessage(err: unknown): string | null {
  const fields = uniqueConstraintFields(err);
  if (!fields) return null;
  const joined = fields.join(",");
  if (joined.includes("purchase_no")) return "That purchase number is already used.";
  return "That value is already in use.";
}
