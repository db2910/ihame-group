import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { fetchProofImage } from "@/lib/storage";

// Same pattern as sale/[id]/proof and orders/.../proof — private bucket,
// proxied through this app's own session check. Simpler scoping than those
// two: expenses are manager-only everywhere else, so there's no staff
// ownership rule to re-check here, just the role itself.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole(["manager"]);
  const { id } = await params;

  const expense = await db.expense.findUnique({
    where: { id },
    select: { proofOfPaymentPath: true },
  });
  if (!expense || !expense.proofOfPaymentPath) {
    return new Response(null, { status: 404 });
  }

  const image = await fetchProofImage(expense.proofOfPaymentPath);
  if (!image) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(image.buffer), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "private, no-store",
    },
  });
}
