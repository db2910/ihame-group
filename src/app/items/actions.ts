"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/dal";
import { recordAuditChanges } from "@/lib/audit";
import { generateItemSku } from "@/lib/item-sku";

const UNITS = ["piece", "metre", "kg", "bag", "litre", "box"] as const;

const decimalString = (label: string, { min = 0 }: { min?: number } = {}) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), `${label} must be a number with at most 2 decimals.`)
    .refine((v) => Number(v) >= min, `${label} cannot be less than ${min}.`);

const itemSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required.").max(40, "SKU is too long."),
  barcode: z.string().trim().max(40, "Barcode is too long.").optional(),
  name: z.string().trim().min(1, "Item name is required."),
  categoryId: z.string().trim().min(1, "Category is required."),
  newCategoryName: z.string().trim().optional(),
  unit: z.enum(UNITS),
  sellPrice: decimalString("Sell price"),
  reorderLevel: decimalString("Reorder level"),
});

export type ItemFormState = { error: string } | { success: true } | undefined;

function emptyToUndefined(v: FormDataEntryValue | null): string | undefined {
  const s = v?.toString().trim();
  return s ? s : undefined;
}

function readForm(formData: FormData) {
  return itemSchema.safeParse({
    sku: formData.get("sku"),
    barcode: emptyToUndefined(formData.get("barcode")),
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    newCategoryName: emptyToUndefined(formData.get("newCategoryName")),
    unit: formData.get("unit"),
    sellPrice: formData.get("sellPrice"),
    reorderLevel: formData.get("reorderLevel"),
  });
}

// The category select carries this sentinel when the manager chose "+ New
// category…", so a category can be created inline rather than forcing a
// detour to a screen that doesn't exist.
const NEW_CATEGORY = "__new__";

async function resolveCategoryId(
  categoryId: string,
  newCategoryName: string | undefined,
): Promise<{ id: string } | { error: string }> {
  if (categoryId !== NEW_CATEGORY) return { id: categoryId };

  const name = newCategoryName?.trim();
  if (!name) return { error: "Enter a name for the new category." };

  const category = await db.category.upsert({
    where: { name },
    update: {},
    create: { name },
  });
  return { id: category.id };
}

export async function createItemAction(
  _prevState: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  // Spec §2: only the manager manages items and stock. Re-checked here, not
  // just at the page gate.
  const user = await requireRole(["manager"]);

  const parsed = readForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const category = await resolveCategoryId(data.categoryId, data.newCategoryName);
  if ("error" in category) return { error: category.error };

  // An item's cost price follows its most recent purchase and is never
  // edited directly here. The one exception is this seed value: stock that
  // predates the system has to enter its cost somewhere, and the
  // alternative is a catalogue that reports zero margin until its first
  // purchase. Recorded as an `opening` movement so the ledger explains it.
  const openingQty = emptyToUndefined(formData.get("openingQuantity"));
  const openingCost = emptyToUndefined(formData.get("openingCost"));

  if (openingQty && !/^\d+(\.\d{1,2})?$/.test(openingQty)) {
    return { error: "Opening quantity must be a number with at most 2 decimals." };
  }
  if (openingCost && !/^\d+(\.\d{1,2})?$/.test(openingCost)) {
    return { error: "Opening cost must be a number with at most 2 decimals." };
  }
  if (openingQty && Number(openingQty) > 0 && !openingCost) {
    return { error: "Enter the unit cost of the opening stock." };
  }

  try {
    await db.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          sku: data.sku,
          barcode: data.barcode ?? null,
          name: data.name,
          categoryId: category.id,
          unit: data.unit,
          costPrice: openingCost ? new Prisma.Decimal(openingCost) : new Prisma.Decimal(0),
          sellPrice: new Prisma.Decimal(data.sellPrice),
          reorderLevel: new Prisma.Decimal(data.reorderLevel),
          createdById: user.id,
        },
      });

      if (openingQty && Number(openingQty) > 0) {
        await tx.stockMovement.create({
          data: {
            itemId: item.id,
            movementType: "opening",
            quantity: new Prisma.Decimal(openingQty),
            unitCost: new Prisma.Decimal(openingCost!),
            createdById: user.id,
          },
        });
      }
    });
  } catch (err) {
    return { error: uniqueConstraintMessage(err) ?? "Could not save the item." };
  }

  revalidatePath("/items");
  return { success: true };
}

export async function updateItemAction(
  _prevState: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  const user = await requireRole(["manager"]);
  const itemId = String(formData.get("itemId") ?? "");

  const parsed = readForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const existing = await db.item.findUnique({
    where: { id: itemId },
    include: { category: { select: { name: true } } },
  });
  if (!existing) return { error: "That item no longer exists." };

  const category = await resolveCategoryId(data.categoryId, data.newCategoryName);
  if ("error" in category) return { error: category.error };

  try {
    // Note what is *not* here: costPrice. It only ever moves via a purchase
    // (or an opening entry) — never edited directly on this form.
    const updated = await db.item.update({
      where: { id: itemId },
      data: {
        sku: data.sku,
        barcode: data.barcode ?? null,
        name: data.name,
        categoryId: category.id,
        unit: data.unit,
        sellPrice: new Prisma.Decimal(data.sellPrice),
        reorderLevel: new Prisma.Decimal(data.reorderLevel),
      },
      include: { category: { select: { name: true } } },
    });

    await recordAuditChanges({
      tableName: "items",
      recordId: itemId,
      changedById: user.id,
      before: {
        sku: existing.sku,
        barcode: existing.barcode,
        name: existing.name,
        category: existing.category.name,
        unit: existing.unit,
        sell_price: existing.sellPrice.toFixed(2),
        reorder_level: existing.reorderLevel.toFixed(2),
      },
      after: {
        sku: updated.sku,
        barcode: updated.barcode,
        name: updated.name,
        category: updated.category.name,
        unit: updated.unit,
        sell_price: updated.sellPrice.toFixed(2),
        reorder_level: updated.reorderLevel.toFixed(2),
      },
    });
  } catch (err) {
    return { error: uniqueConstraintMessage(err) ?? "Could not save the item." };
  }

  revalidatePath("/items");
  return { success: true };
}

// Spec §5/§4: items are deactivated, never deleted — the ledger and past
// sales still reference them.
export async function toggleItemActiveAction(formData: FormData): Promise<void> {
  const user = await requireRole(["manager"]);
  const itemId = String(formData.get("itemId") ?? "");

  const item = await db.item.findUnique({ where: { id: itemId } });
  if (!item) return;

  await db.item.update({
    where: { id: itemId },
    data: { isActive: !item.isActive },
  });

  await recordAuditChanges({
    tableName: "items",
    recordId: itemId,
    changedById: user.id,
    before: { is_active: String(item.isActive) },
    after: { is_active: String(!item.isActive) },
  });

  revalidatePath("/items");
}

export async function suggestSkuAction(): Promise<string> {
  await requireRole(["manager"]);
  return generateItemSku();
}

function uniqueConstraintMessage(err: unknown): string | null {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") {
    return null;
  }
  const target = err.meta?.target;
  const fields = Array.isArray(target) ? target.join(",") : String(target ?? "");
  if (fields.includes("sku")) return "That SKU is already used by another item.";
  if (fields.includes("barcode")) return "That barcode is already used by another item.";
  return "That value is already used by another item.";
}
