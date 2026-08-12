"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/dal";

const adjustmentSchema = z.object({
  itemId: z.string().trim().min(1, "Select an item."),
  direction: z.enum(["in", "out"], { message: "Select a direction." }),
  quantity: z
    .string()
    .trim()
    .min(1, "Quantity is required.")
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Quantity must be a number with at most 2 decimals.")
    .refine((v) => Number(v) > 0, "Quantity must be greater than 0."),
  // Spec §6.5b / §4: required for adjustment movements — the ledger has to
  // explain itself, since a save here is final (no approval step).
  reason: z.string().trim().min(5, "Reason must be at least 5 characters."),
});

export type AdjustmentFormState = { error: string } | { success: true } | undefined;

export async function createAdjustmentAction(
  _prevState: AdjustmentFormState,
  formData: FormData,
): Promise<AdjustmentFormState> {
  // Spec §2: only the manager manages stock.
  const user = await requireRole(["manager"]);

  const parsed = adjustmentSchema.safeParse({
    itemId: formData.get("itemId"),
    direction: formData.get("direction"),
    quantity: formData.get("quantity"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const magnitude = new Prisma.Decimal(data.quantity);
  const signedQuantity = data.direction === "out" ? magnitude.negated() : magnitude;

  try {
    await db.stockMovement.create({
      data: {
        itemId: data.itemId,
        movementType: "adjustment",
        quantity: signedQuantity,
        note: data.reason,
        createdById: user.id,
      },
    });
  } catch {
    return { error: "Could not save the adjustment." };
  }

  revalidatePath("/adjustments");
  revalidatePath("/items");
  return { success: true };
}
