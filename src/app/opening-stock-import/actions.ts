"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/dal";
import { generateItemSkus } from "@/lib/item-sku";

const UNITS = ["piece", "metre", "kg", "bag", "litre", "box"] as const;

// Every row on this screen represents stock that already exists — a blank
// quantity or a zero doesn't mean anything here (that's just a new item,
// which belongs on the regular Add-item form instead), so quantity has a
// stricter minimum than the other decimal fields on this screen.
const decimalString = (label: string, { min = 0 }: { min?: number } = {}) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), `${label} must be a number with at most 2 decimals.`)
    .refine((v) => Number(v) >= min, `${label} cannot be less than ${min}.`);

const rowSchema = z.object({
  sku: z.string().trim().max(40, "SKU is too long."),
  name: z.string().trim().min(1, "Item name is required."),
  category: z.string().trim().min(1, "Category is required."),
  unit: z.enum(UNITS, { message: "Select a unit." }),
  sellPrice: decimalString("Sell price"),
  reorderLevel: decimalString("Reorder level"),
  quantity: decimalString("Quantity", { min: 0.01 }),
  unitCost: decimalString("Unit cost"),
});

type Row = z.infer<typeof rowSchema>;

export type ImportFormState = { error: string } | { success: true; count: number } | undefined;

// The whole screen's one-time-use lock: no dedicated settings table, just
// "has any row with this reference_type ever been written." referenceId
// carries a shared batch id per import run (not used for the lock check
// itself, just so every row from one run is traceable back to it later).
const LOCK_REFERENCE_TYPE = "opening_import";

export async function isOpeningStockImportLocked(): Promise<boolean> {
  const existing = await db.stockMovement.findFirst({ where: { referenceType: LOCK_REFERENCE_TYPE } });
  return !!existing;
}

function readRows(formData: FormData): { rows: Row[] } | { error: string } {
  const skus = formData.getAll("sku").map(String);
  const names = formData.getAll("name").map(String);
  const categories = formData.getAll("category").map(String);
  const units = formData.getAll("unit").map(String);
  const sellPrices = formData.getAll("sellPrice").map(String);
  const reorderLevels = formData.getAll("reorderLevel").map(String);
  const quantities = formData.getAll("quantity").map(String);
  const unitCosts = formData.getAll("unitCost").map(String);

  const raw = names.map((_, i) => ({
    sku: skus[i] ?? "",
    name: names[i] ?? "",
    category: categories[i] ?? "",
    unit: units[i] ?? "",
    sellPrice: sellPrices[i] ?? "",
    reorderLevel: reorderLevels[i] || "0",
    quantity: quantities[i] ?? "",
    unitCost: unitCosts[i] ?? "",
  }));

  // A row can only be entirely blank if the manager added one and never
  // filled it in (or removed a CSV-imported row down to nothing) — dropped
  // silently, same reasoning as Purchases' empty trailing line.
  const nonEmpty = raw.filter((r) => r.name.trim() || r.category.trim() || r.quantity.trim());
  if (nonEmpty.length === 0) {
    return { error: "Add at least one item." };
  }

  const rows: Row[] = [];
  for (const [i, r] of nonEmpty.entries()) {
    const parsed = rowSchema.safeParse(r);
    if (!parsed.success) {
      return { error: `Row ${i + 1}: ${parsed.error.issues[0]?.message ?? "Invalid value."}` };
    }
    rows.push(parsed.data);
  }
  return { rows };
}

export async function importOpeningStockAction(
  _prevState: ImportFormState,
  formData: FormData,
): Promise<ImportFormState> {
  // Spec §2: only the manager manages items and stock.
  const user = await requireRole(["manager"]);

  if (await isOpeningStockImportLocked()) {
    return { error: "Opening stock has already been imported — this is a one-time step." };
  }

  const result = readRows(formData);
  if ("error" in result) return { error: result.error };
  const rows = result.rows;

  // Pre-flight duplicate-SKU check — a specific, row-level error beats a raw
  // unique-constraint failure partway through a 50-row transaction.
  const explicitSkus = rows.map((r) => r.sku).filter(Boolean);
  const dupeInBatch = explicitSkus.find((sku, i) => explicitSkus.indexOf(sku) !== i);
  if (dupeInBatch) {
    return { error: `SKU "${dupeInBatch}" is used by more than one row.` };
  }
  if (explicitSkus.length > 0) {
    const clash = await db.item.findFirst({ where: { sku: { in: explicitSkus } }, select: { sku: true } });
    if (clash) return { error: `SKU "${clash.sku}" already exists.` };
  }

  const blankSkuRows = rows.filter((r) => !r.sku).length;
  const generatedSkus = blankSkuRows > 0 ? await generateItemSkus(blankSkuRows) : [];
  let nextGenerated = 0;

  const batchId = crypto.randomUUID();

  try {
    await db.$transaction(async (tx) => {
      // Re-checked inside the transaction to close the race between the
      // check above and the write — unlikely for a screen one manager uses
      // once, ever, but cheap to close properly rather than assume.
      const stillUnlocked = !(await tx.stockMovement.findFirst({ where: { referenceType: LOCK_REFERENCE_TYPE } }));
      if (!stillUnlocked) throw new Error("LOCKED");

      const categoryIdByName = new Map<string, string>();
      for (const row of rows) {
        if (categoryIdByName.has(row.category)) continue;
        const category = await tx.category.upsert({
          where: { name: row.category },
          update: {},
          create: { name: row.category },
        });
        categoryIdByName.set(row.category, category.id);
      }

      for (const row of rows) {
        const sku = row.sku || generatedSkus[nextGenerated++];
        const item = await tx.item.create({
          data: {
            sku,
            name: row.name,
            categoryId: categoryIdByName.get(row.category)!,
            unit: row.unit,
            costPrice: new Prisma.Decimal(row.unitCost),
            sellPrice: new Prisma.Decimal(row.sellPrice),
            reorderLevel: new Prisma.Decimal(row.reorderLevel),
            createdById: user.id,
          },
        });
        await tx.stockMovement.create({
          data: {
            itemId: item.id,
            movementType: "opening",
            quantity: new Prisma.Decimal(row.quantity),
            unitCost: new Prisma.Decimal(row.unitCost),
            referenceType: LOCK_REFERENCE_TYPE,
            referenceId: batchId,
            createdById: user.id,
          },
        });
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "LOCKED") {
      return { error: "Opening stock has already been imported — this is a one-time step." };
    }
    return { error: uniqueConstraintMessage(err) ?? "Could not save the import." };
  }

  revalidatePath("/opening-stock-import");
  revalidatePath("/items");
  return { success: true, count: rows.length };
}

function uniqueConstraintMessage(err: unknown): string | null {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") {
    return null;
  }
  const target = err.meta?.target;
  const fields = Array.isArray(target) ? target.join(",") : String(target ?? "");
  if (fields.includes("sku")) return "One of these SKUs is already used by another item.";
  return "One of these values is already in use.";
}
