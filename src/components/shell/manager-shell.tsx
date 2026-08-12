"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SignOutButton } from "./sign-out-button";
import { MenuIcon, CloseIcon, LogoutIcon } from "./icons";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { Toaster } from "@/components/ui/toast";

type NavItem = {
  key: string;
  label: string;
  href: string;
  badge?: { value: string; tone: "brand" | "alert" };
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

// Real counts, not fake ones — omitted (undefined) whenever there's nothing
// to flag, same "hide at zero" convention as the low-stock banner on Items.
export type ManagerNavBadges = {
  awaitingReview?: number;
  lowStock?: number;
};

// Spec §6/nav chrome table: manager sidebar, 216px, grouped OVERVIEW / FREIGHT
// / SHOP / ADMIN. A function (not a static array) because the two badge
// counts are per-request data, supplied by ManagerShellFrame — this
// component itself stays a plain, badge-count-agnostic client shell.
function buildNavGroups(badges: ManagerNavBadges): NavGroup[] {
  return [
    { title: "OVERVIEW", items: [{ key: "dashboard", label: "Dashboard", href: "/dashboard" }] },
    {
      title: "FREIGHT",
      items: [
        {
          key: "all-orders",
          label: "All orders",
          href: "/all-orders",
          badge: badges.awaitingReview ? { value: String(badges.awaitingReview), tone: "brand" } : undefined,
        },
        { key: "bulk-status", label: "Bulk status update", href: "/bulk-status" },
        { key: "customers", label: "Customers", href: "/customers" },
      ],
    },
    {
      title: "SHOP",
      items: [
        { key: "items", label: "Items", href: "/items" },
        { key: "opening-stock-import", label: "Opening stock import", href: "/opening-stock-import" },
        { key: "sales", label: "Today's sales", href: "/sale/today" },
        { key: "purchases", label: "Purchases", href: "/purchases" },
        { key: "stock-movements", label: "Stock movements", href: "/stock-movements" },
        // Per the low-stock scope decision (10 Aug 2026): a sidebar link into
        // Items' own existing filter, not a second screen duplicating it.
        {
          key: "low-stock",
          label: "Low stock",
          href: "/items?status=low",
          badge: badges.lowStock ? { value: String(badges.lowStock), tone: "alert" } : undefined,
        },
        { key: "adjustments", label: "Adjustments", href: "/adjustments" },
      ],
    },
    {
      title: "ADMIN",
      items: [
        { key: "reports", label: "Reports", href: "/reports" },
        { key: "users", label: "Users", href: "/users" },
        { key: "audit-log", label: "Audit log", href: "/audit-log" },
      ],
    },
  ];
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ManagerShell({
  active,
  user,
  badges = {},
  children,
}: {
  active: string;
  user: { name: string };
  badges?: ManagerNavBadges;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  useScrollLock(open);
  const navGroups = buildNavGroups(badges);

  return (
    <div className="flex min-h-dvh flex-col bg-app md:flex-row">
      <Toaster />
      {/* Mobile-only top strip — the sidebar is off-canvas by default below
          the md breakpoint, so this is the only way back to it. `sticky`
          (not `fixed`): nothing in this layout currently bounds `<main>` to
          the viewport height, so on a tall page the whole document scrolls
          rather than an inner region — confirmed live (top bar's
          getBoundingClientRect().top went to -600 after a 600px scroll).
          `sticky` pins it to the actual scrolling container regardless,
          without needing to fix that deeper layout question. */}
      <div className="sticky top-0 z-30 flex h-14 flex-none items-center gap-3 border-b border-border bg-dark px-4 md:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <Image src="/assets/ihame-mark.png" alt="IHAME" width={30} height={14} className="h-auto w-[30px]" />
        <span className="font-sans text-[12px] font-semibold tracking-[0.1em] text-white/80">IHAME GROUP</span>
      </div>

      {open && (
        <button
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[216px] flex-none flex-col bg-dark py-5 text-white transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-0.5 pb-[22px]">
          <div className="flex items-center gap-3">
            <Image src="/assets/ihame-mark.png" alt="IHAME" width={58} height={26} className="h-auto w-[58px]" />
            <div className="font-sans text-[12px] leading-[1.4] font-semibold tracking-[0.1em] text-white/70">
              IHAME
              <br />
              GROUP
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white md:hidden"
          >
            <CloseIcon className="h-4.5 w-4.5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.title}>
              <div className="px-5 pt-[18px] pb-2 font-mono text-[12.5px] leading-none font-medium tracking-[0.12em] text-white/46">
                {group.title}
              </div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const isActive = item.key === active;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center justify-between gap-2.5 border-l-[3px] px-5 py-2 font-sans text-[15px] ${
                        isActive
                          ? "border-accent bg-white/9 font-medium text-white"
                          : "border-transparent font-normal text-white/72 hover:bg-white/5"
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.badge && (
                        <span
                          className={`rounded-[9px] px-1.5 py-px font-mono text-[12px] font-medium text-white ${
                            item.badge.tone === "alert" ? "bg-alert" : "bg-brand"
                          }`}
                        >
                          {item.badge.value}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 px-5 pt-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand font-sans text-[12px] font-semibold">
              {initials(user.name)}
            </div>
            <div className="min-w-0">
              <div className="truncate font-sans text-[14px] leading-[1.2] font-medium">{user.name}</div>
              <div className="font-sans text-[12px] leading-[1.3] text-white/45">Manager</div>
            </div>
          </div>
          <SignOutButton
            pendingLabel="Signing out…"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-white/15 py-2 font-sans text-[14px] font-medium text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-60"
          >
            <LogoutIcon className="h-4 w-4" />
            Sign out
          </SignOutButton>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
