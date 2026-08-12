"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/dal";
import { recordAuditChange } from "@/lib/audit";
import { uploadProofImage } from "@/lib/storage";
import {
  attemptCompleteSale,
  lineSchema,
  InsufficientStockError,
  ItemUnavailableError,
  type LineDraft,
} from "@/lib/complete-sale";

function readLines(formData: FormData): { lines: LineDraft[] } | { error: string } {
  const itemIds = formData.getAll("itemId").map(String);
  const quantities = formData.getAll("quantity").map(String);
  const unitPrices = formData.getAll("unitPrice").map(String);

  const rows = itemIds.map((itemId, i) => ({
    itemId,
    quantity: quantities[i] ?? "",
    unitPrice: unitPrices[i] ?? "",
  }));
  const nonEmpty = rows.filter((r) => r.itemId);
  if (nonEmpty.length === 0) {
    return { error: "Add at least one item to the cart." };
  }

  const parsedLines: LineDraft[] = [];
  for (const row of nonEmpty) {
    const parsed = lineSchema.safeParse(row);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid line." };
    }
    parsedLines.push(parsed.data);
  }
  return { lines: parsedLines };
}

const saleHeaderSchema = z.object({
  paymentMethod: z.enum(["cash", "momo", "bank", "card"], { message: "Select a payment method." }),
  // Generated client-side the moment "Complete sale" is tapped (pos.tsx),
  // before it's known whether the request will reach the server —
  // experimental.useOffline (next.config.ts) can retry this action once
  // connectivity returns, and without a stable key to dedupe on, a retried
  // call whose first response got lost would create a second sale.
  clientRequestId: z.string().trim().min(1).nullable(),
});

export type CompleteSaleResult = { success: true; saleNo: string } | { error: string };

export async function completeSaleAction(formData: FormData): Promise<CompleteSaleResult> {
  // Spec §2 / authz.ts's recordSale permission: manager or shop staff.
  const user = await requireRole(["manager", "shop_staff"]);

  const header = saleHeaderSchema.safeParse({
    paymentMethod: formData.get("paymentMethod"),
    clientRequestId: formData.get("clientRequestId"),
  });
  if (!header.success) {
    return { error: header.error.issues[0]?.message ?? "Invalid input." };
  }

  const proofFileValue = formData.get("proofFile");
  const proofFile = proofFileValue instanceof File && proofFileValue.size > 0 ? proofFileValue : null;
  if (header.data.paymentMethod !== "cash" && !proofFile) {
    return { error: "Attach proof of payment for this payment method." };
  }

  // Uploaded before the DB transaction starts, not inside it — this is a
  // slow external network call, and a $transaction callback is meant to
  // hold the DB connection for as short a time as possible. The trade-off,
  // accepted rather than engineered around: a sale that fails validation
  // *after* a successful upload (e.g. a stock race) leaves an orphaned
  // image in storage. Rare, and cheap to leave — not worth a two-phase
  // commit for a payment-proof photo.
  let proofOfPaymentPath: string | null = null;
  if (proofFile) {
    const uploaded = await uploadProofImage(proofFile, "sales");
    if ("error" in uploaded) return { error: uploaded.error };
    proofOfPaymentPath = uploaded.path;
  }

  const linesResult = readLines(formData);
  if ("error" in linesResult) return { error: linesResult.error };

  let sale;
  try {
    sale = await attemptCompleteSale(
      user.id,
      { paymentMethod: header.data.paymentMethod, proofOfPaymentPath },
      linesResult.lines,
      header.data.clientRequestId,
    );
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return { error: `Not enough stock of ${err.sku} (${err.name}) to complete this sale.` };
    }
    if (err instanceof ItemUnavailableError) {
      return { error: `${err.label} is no longer on sale. Remove it from the cart and try again.` };
    }
    // P2020 = value out of range for the column. In practice this is a
    // mistyped price or quantity overflowing Decimal(14,2) — worth naming,
    // since the cashier can actually fix it.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2020") {
      return { error: "A price or quantity in this cart is too large to record. Check the amounts and try again." };
    }
    // Everything else is genuinely unexpected: keep the cashier's message
    // plain, but never swallow the cause — a counter-side failure with
    // nothing in the server log is impossible to diagnose after the fact.
    console.error("[completeSaleAction] sale failed", {
      userId: user.id,
      paymentMethod: header.data.paymentMethod,
      lines: linesResult.lines,
      err,
    });
    return { error: "Could not complete the sale. Please try again — if it keeps failing, tell the manager." };
  }

  revalidatePath("/sale");
  revalidatePath("/sale/today");
  revalidatePath("/sale/stock-lookup");
  revalidatePath("/items");
  revalidatePath("/stock-movements");
  return { success: true, saleNo: sale.saleNo };
}

const voidSchema = z.object({
  saleId: z.string().trim().min(1),
  // No approval step, same reasoning as adjustments: the ledger has to
  // explain itself since a void can't be undone.
  reason: z.string().trim().min(5, "Reason must be at least 5 characters."),
});

export type VoidSaleFormState = { error: string } | { success: true } | undefined;

export async function voidSaleAction(
  _prevState: VoidSaleFormState,
  formData: FormData,
): Promise<VoidSaleFormState> {
  const user = await requireRole(["manager"]);

  const parsed = voidSchema.safeParse({
    saleId: formData.get("saleId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { saleId, reason } = parsed.data;

  const sale = await db.sale.findUnique({ where: { id: saleId }, include: { items: true } });
  if (!sale) return { error: "That sale no longer exists." };
  if (sale.isVoided) return { error: "That sale is already voided." };

  try {
    await db.$transaction(async (tx) => {
      // Never delete or rewrite the original sale movements — insert
      // reversing positive `return` rows instead, same ledger they came from.
      for (const line of sale.items) {
        await tx.stockMovement.create({
          data: {
            itemId: line.itemId,
            movementType: "return",
            quantity: line.quantity,
            referenceType: "sale",
            referenceId: sale.id,
            createdById: user.id,
          },
        });
      }

      await tx.sale.update({
        where: { id: saleId },
        data: { isVoided: true, voidReason: reason, voidedAt: new Date(), voidedById: user.id },
      });

      await recordAuditChange({
        tableName: "sales",
        recordId: saleId,
        fieldName: "is_voided",
        oldValue: "false",
        newValue: "true",
        changedById: user.id,
      });
    });
  } catch {
    return { error: "Could not void the sale." };
  }

  revalidatePath("/sale/today");
  revalidatePath("/items");
  revalidatePath("/stock-movements");
  return { success: true };
}
