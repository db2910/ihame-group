import Image from "next/image";
import { SignOutButton } from "./sign-out-button";
import { StaffNavTabs } from "./staff-nav-tabs";
import { LogoutIcon } from "./icons";
import { Toaster } from "@/components/ui/toast";

type Tab = { key: string; label: string; href: string };

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function StaffTopBar({
  role,
  user,
  tabs,
  active,
  children,
}: {
  role: "freight_staff" | "shop_staff";
  user: { name: string };
  tabs: Tab[];
  active: string;
  children: React.ReactNode;
}) {
  const avatarClass = role === "freight_staff" ? "bg-accent text-dark" : "bg-brand text-white";

  return (
    <div className="flex min-h-dvh flex-col bg-app">
      <Toaster />
      {/* Logo text + 3 tabs + avatar/sign-out never fit a real 390px phone at
          desktop sizing (measured: ~450px of content in a 390px header) — this
          had apparently never been checked at a phone width before. Wordmark
          text drops below sm (the icon mark alone is enough to identify the
          app), and the nav scrolls internally rather than forcing the header
          wider if tab labels ever grow past what even that leaves.
          `sticky` below `md` only (per the request this addressed — "on
          small devices"): nothing in this layout currently bounds `<main>`
          to the viewport height, so on a tall page the whole document
          scrolls rather than an inner region (confirmed live), which drags
          a plain-flow header off-screen with it. `sticky` pins it to the
          real scrolling container regardless, without touching that deeper
          layout question. Left as static at `md`+ — desktop wasn't part of
          what was asked, and this shell's `<header>` is shared across every
          width unlike the manager shell's mobile-only strip. */}
      <header className="sticky top-0 z-30 flex h-[58px] flex-none items-center gap-3 bg-nav px-4 text-white md:static md:gap-7 md:px-6">
        <div className="flex flex-none items-center gap-2.5">
          <Image src="/assets/ihame-mark.png" alt="IHAME" width={44} height={20} className="h-auto w-11" />
          <span className="hidden font-sans text-xs leading-none font-semibold tracking-[0.14em] sm:block">
            IHAME GROUP
          </span>
        </div>

        <StaffNavTabs tabs={tabs} active={active} />

        <div className="ml-auto flex flex-none items-center gap-3">
          <div className="hidden max-w-[140px] truncate font-mono text-[12px] text-white/40 sm:block">
            {user.name}
          </div>
          <div
            className={`flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full font-sans text-[12px] font-semibold ${avatarClass}`}
          >
            {initials(user.name)}
          </div>
          <SignOutButton
            title="Sign out"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white disabled:text-white/80"
          >
            <span className="sr-only">Sign out</span>
            <LogoutIcon className="h-[18px] w-[18px]" />
          </SignOutButton>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
