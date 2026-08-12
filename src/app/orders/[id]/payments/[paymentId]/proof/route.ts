import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { fetchProofImage } from "@/lib/storage";

// Same reasoning as sale/[id]/proof/route.ts — private bucket, proxied
// through this app's own session + ownership check rather than a
// public/signed URL.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  const user = await requireRole(["manager", "freight_staff"]);
  const { id: orderId, paymentId } = await params;

  const payment = await db.orderPayment.findUnique({
    where: { id: paymentId },
    select: { orderId: true, proofOfPaymentPath: true, order: { select: { createdById: true } } },
  });
  if (!payment || payment.orderId !== orderId || !payment.proofOfPaymentPath) {
    return new Response(null, { status: 404 });
  }

  // Freight staff API scope: only ever their own orders — same rule
  // src/app/orders/[id]/page.tsx and every order action already applies.
  if (user.role === "freight_staff" && payment.order.createdById !== user.id) {
    return new Response(null, { status: 404 });
  }

  const image = await fetchProofImage(payment.proofOfPaymentPath);
  if (!image) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(image.buffer), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "private, no-store",
    },
  });
}
