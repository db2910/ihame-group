import Image from "next/image";

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
// chrome here at all. A brief top-bar-shaped placeholder before a manager's
// sidebar layout settles in is a minor visual hiccup; a real user seeing
// another role's nav items, even briefly, is not.
export function NeutralLoadingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-app">
      <div className="flex h-14 flex-none items-center gap-3 border-b border-border bg-dark px-4 md:px-6">
        <Image src="/assets/ihame-mark.png" alt="IHAME" width={30} height={14} className="h-auto w-[30px]" />
        <span className="font-sans text-[12px] font-semibold tracking-[0.1em] text-white/80">IHAME GROUP</span>
      </div>
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
