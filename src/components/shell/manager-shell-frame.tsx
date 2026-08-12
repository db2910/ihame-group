import { ManagerShell } from "./manager-shell";
import { awaitingReviewSummary } from "@/lib/order-metrics";
import { lowStockSummary } from "@/lib/stock";

// Server Component wrapper around ManagerShell (a "use client" shell, for
// its off-canvas-menu state) — fetches the two sidebar badge counts once
// here so every manager page doesn't have to duplicate that query pair just
// to render its own nav. Deliberately not used by any loading.tsx: those
// render before a session is trustworthy to query against (see
// NeutralLoadingShell's comment) — a loading skeleton just shows no badge
// yet, which is a normal, harmless "hasn't loaded" state, not a wrong one.
export async function ManagerShellFrame({
  active,
  user,
  children,
}: {
  active: string;
  user: { name: string };
  children: React.ReactNode;
}) {
  const [awaitingReview, lowStock] = await Promise.all([awaitingReviewSummary(), lowStockSummary()]);

  return (
    <ManagerShell
      active={active}
      user={user}
      badges={{ awaitingReview: awaitingReview.count, lowStock: lowStock.count }}
    >
      {children}
    </ManagerShell>
  );
}
