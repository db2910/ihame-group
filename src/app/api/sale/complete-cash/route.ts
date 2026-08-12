import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/dal";
import { attemptCompleteSale, lineSchema, InsufficientStockError, ItemUnavailableError } from "@/lib/complete-sale";

// The sync target for the POS offline queue (src/lib/offline/sale-queue.ts)
// — cash sales only (Phase 7 scope decision: non-cash methods need a proof
// photo and stay online-only, unchanged, via completeSaleAction). Deliberately
// its own JSON Route Handler rather than reusing completeSaleAction's FormData
// Server-Action calling convention: the flush loop needs a plain fetch() it
// can retry on its own schedule and read a real HTTP status from, and
// auth here is checked with getCurrentUser() rather than requireRole()'s
// redirect() — a redirect to /login is meaningless to a background fetch,
// the client just needs a clean 401 it can show as "sign in again to sync."
const bodySchema = z.object({
  clientRequestId: z.string().trim().min(1),
  lines: z.array(lineSchema).min(1),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Your session has expired. Sign in again to sync pending sales." }, { status: 401 });
  }
  if (user.role !== "manager" && user.role !== "shop_staff") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  let sale;
  try {
    sale = await attemptCompleteSale(
      user.id,
      { paymentMethod: "cash", proofOfPaymentPath: null },
      parsed.data.lines,
      parsed.data.clientRequestId,
    );
  } catch (err) {
    // 409/422-style failures — real rejections, not connectivity problems.
    // The queue (sale-queue.ts) marks these "failed" rather than retrying
    // them forever, so one bad queued sale can't block every sale behind it.
    if (err instanceof InsufficientStockError) {
      return NextResponse.json(
        { error: `Not enough stock of ${err.sku} (${err.name}) to complete this sale.` },
        { status: 409 },
      );
    }
    if (err instanceof ItemUnavailableError) {
      return NextResponse.json({ error: `${err.label} is no longer on sale.` }, { status: 409 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2020") {
      return NextResponse.json(
        { error: "A price or quantity in this cart is too large to record." },
        { status: 400 },
      );
    }
    console.error("[complete-cash] sale failed", { userId: user.id, clientRequestId: parsed.data.clientRequestId, err });
    return NextResponse.json({ error: "Could not complete the sale." }, { status: 500 });
  }

  revalidatePath("/sale");
  revalidatePath("/sale/today");
  revalidatePath("/sale/stock-lookup");
  revalidatePath("/items");
  revalidatePath("/stock-movements");
  return NextResponse.json({ success: true, saleNo: sale.saleNo });
}
