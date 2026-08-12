import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { fetchProofImage } from "@/lib/storage";

// Authenticated proof-of-payment image serving (Phase 7) — the bucket is
// private; every request re-checks the session and the same ownership rule
// the rest of the app already applies to this sale, then proxies the bytes
// through rather than handing back a public/signed URL that could be shared
// or bookmarked past its own access check.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["manager", "shop_staff"]);
  const { id } = await params;

  const sale = await db.sale.findUnique({
    where: { id },
    select: { proofOfPaymentPath: true, createdAt: true },
  });
  if (!sale || !sale.proofOfPaymentPath) {
    return new Response(null, { status: 404 });
  }

  // Shop staff see today's sales only (src/app/sale/today/page.tsx's own
  // query scope) — re-checked here rather than trusted from the page, same
  // defense-in-depth every other role check in this app already follows.
  if (user.role === "shop_staff") {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    if (sale.createdAt < start || sale.createdAt >= end) {
      return new Response(null, { status: 404 });
    }
  }

  const image = await fetchProofImage(sale.proofOfPaymentPath);
  if (!image) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(image.buffer), {
    headers: {
      "Content-Type": image.contentType,
      // Private: this is a payment-proof photo, not a cacheable public asset.
      "Cache-Control": "private, no-store",
    },
  });
}
