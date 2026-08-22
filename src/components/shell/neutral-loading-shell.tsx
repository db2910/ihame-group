// For routes shared between two roles (Customers, order detail, Today's
// sales) — where the real page picks ManagerShell vs StaffTopBar based on
// who's asking. loading.tsx used to do that same getCurrentUser() check,
// but a Next.js route's loading state can be served from a prefetch taken
// at a different moment than the actual navigation (confirmed live, 11 Aug
// 2026: a manager clicking through to Today's sales got a real, if brief,
// flash of the shop_staff top bar — not a timing coincidence, reproducible
// under throttling every time). A loading.tsx that depends on per-request
// session data can't be trusted to reflect the session making that exact
// request.
//
// The fix is to not need to know: no nav, no avatar, nothing here that
// could ever be the *wrong* role's chrome, because there's no role-specific
// chrome here at all.
//
// Round 2 (22 Aug 2026): this header used to render the real logo + "IHAME
// GROUP" wordmark, confidently, on the real nav-navy background — and a
// manager reported the exact same "flash of the staff view" symptom this
// component was built to prevent. It never actually renders staff chrome
// (confirmed: no nav tabs, no avatar, nothing role-specific ever appears
// here) — the real cause is subtler. The manager's own header is the *only*
// one with a hamburger button (StaffTopBar has none — staff get tabs, not a
// collapsible sidebar). A confident-looking header missing just that one
// element reads as "the other one" at a glance, even though it isn't
// actually rendering anything staff-specific. Fixed by making this
// obviously a loading placeholder instead of a finished-looking header —
// shimmer blocks, matching how every other route's loading.tsx already
// signals "still loading" for its content — so there's no real header
// silhouette here to mistake for either role's in the first place.
export function NeutralLoadingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-app">
      <div className="flex h-14 flex-none items-center gap-3 border-b border-border bg-nav px-4 md:px-6">
        <div className="h-4 w-4 flex-none animate-pulse rounded bg-white/25" aria-hidden="true" />
        <div className="h-3 w-24 animate-pulse rounded bg-white/25" aria-hidden="true" />
      </div>
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
