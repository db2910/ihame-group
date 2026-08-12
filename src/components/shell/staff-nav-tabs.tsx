"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

type Tab = { key: string; label: string; href: string };

// The nav scrolls internally rather than forcing the header wider (see
// StaffTopBar), but that alone left the active tab itself potentially
// scrolled out of view on load — landing directly on the 3rd tab at a phone
// width showed it half cut-off with no hint there was more to scroll to.
// Scrolling it into view on mount fixes that without needing a visible
// scrollbar or fade affordance.
export function StaffNavTabs({ tabs, active }: { tabs: Tab[]; active: string }) {
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [active]);

  return (
    <nav className="flex h-full min-w-0 items-stretch gap-1 overflow-x-auto font-sans text-[15px] font-medium">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          ref={tab.key === active ? activeRef : undefined}
          href={tab.href}
          className={`flex flex-none items-center px-2.5 whitespace-nowrap md:px-4 ${
            tab.key === active
              ? "text-white shadow-[inset_0_-3px_0_var(--color-accent)]"
              : "text-white/60 hover:text-white/80"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
