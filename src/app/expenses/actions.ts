"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/dal";
import { uploadProofImage } from "@/lib/storage";
import { ExpenseCategory } from "@/generated/prisma/enums";

const createExpenseSchema = z.object({
  orderId: z.string().trim().min(1).nullable(),
  category: z.enum([
    ExpenseCategory.supplier_cost,
    ExpenseCategory.transport,
    ExpenseCategory.customs,
    ExpenseCategory.other,
  ]),
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required.")
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Amount must be a number with at most 2 decimals.")
    .refine((v) => Number(v) > 0, "Amount must be greater than 0."),
  currency: z.enum(["USD", "RWF", "CDF"], { message: "Select a currency." }),
  paidOn: z.string().trim().min(1, "Date is required."),
  note: z.string().trim().optional(),
});

function parseDateOnly(value: string): Date | null {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type CreateExpenseState = { error: string } | { success: true } | undefined;

// Manager-only (spec discussion, 22 Aug 2026) — money going *out* of the
// business is treated with the same sensitivity as voiding a sale or editing
// stock, not something freight staff enter themselves.
export async function createExpenseAction(
  _prevState: CreateExpenseState,
  formData: FormData,
): Promise<CreateExpenseState> {
  const manager = await requireRole(["manager"]);

  const parsed = createExpenseSchema.safeParse({
    orderId: formData.get("orderId") || null,
    category: formData.get("category"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    paidOn: formData.get("paidOn"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const paidOn = parseDateOnly(data.paidOn);
  if (!paidOn) return { error: "Enter a valid date." };

  if (data.orderId) {
    const order = await db.order.findUnique({ where: { id: data.orderId }, select: { id: true } });
    if (!order) return { error: "That order no longer exists." };
  }

  const proofFileValue = formData.get("proofFile");
  const proofFile = proofFileValue instanceof File && proofFileValue.size > 0 ? proofFileValue : null;

  let proofOfPaymentPath: string | null = null;
  if (proofFile) {
    const uploaded = await uploadProofImage(proofFile, "expenses");
    if ("error" in uploaded) return { error: uploaded.error };
    proofOfPaymentPath = uploaded.path;
  }

  await db.expense.create({
    data: {
      orderId: data.orderId,
      category: data.category,
      amount: new Prisma.Decimal(data.amount),
      currency: data.currency,
      note: data.note || null,
      proofOfPaymentPath,
      paidOn,
      recordedById: manager.id,
    },
  });

  revalidatePath("/expenses");
  if (data.orderId) {
    revalidatePath(`/orders/${data.orderId}`);
    revalidatePath("/all-orders");
  }
  return { success: true };
}
