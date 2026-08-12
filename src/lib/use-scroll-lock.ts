"use client";

import { useEffect } from "react";

// iOS Safari ignores `overflow: hidden` on <body> for touch scrolling — the
// page behind a modal or the sidebar drawer kept moving under it even though
// desktop browsers respected the same rule. The reliable cross-browser fix is
// to pin the body with `position: fixed` (iOS does honour that) and restore
// the exact scroll position on unlock, rather than just toggling overflow.
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const scrollY = window.scrollY;
    const body = document.body.style;
    const previous = {
      position: body.position,
      top: body.top,
      left: body.left,
      right: body.right,
      width: body.width,
      overflow: body.overflow,
    };

    body.position = "fixed";
    body.top = `-${scrollY}px`;
    body.left = "0";
    body.right = "0";
    body.width = "100%";
    body.overflow = "hidden";

    return () => {
      body.position = previous.position;
      body.top = previous.top;
      body.left = previous.left;
      body.right = previous.right;
      body.width = previous.width;
      body.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
