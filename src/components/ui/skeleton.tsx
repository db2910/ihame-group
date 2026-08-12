// Shared shimmer-skeleton primitives for route `loading.tsx` files. One real
// primitive (SkeletonBox); everything else is a composition of it, sized to
// match a specific real layout almost exactly — see each route's loading.tsx
// for how these get assembled. Deliberately not used for in-place/button
// pending states (search spinner, Save/Deactivate buttons) — those use
// <Spinner> instead, since a shimmering block mid-row would fight the
// surrounding real content rather than standing in for a whole page.

export function SkeletonBox({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded ${className}`} aria-hidden="true" />;
}

// One row of a desktop data grid (Items/Users/Customers/Audit log all share
// this exact shape: a fixed grid-template-columns row inside a bordered
// card). `widths` gives each cell's bar width as a Tailwind width class, so
// callers can roughly echo their real column content's length without
// needing a bespoke skeleton component per page.
export function SkeletonGridRow({
  gridClassName,
  widths,
  align = [],
}: {
  gridClassName: string;
  widths: string[];
  align?: ("right" | "left")[];
}) {
  return (
    <div className={`${gridClassName} items-center gap-2 border-b border-hairline px-4.5 py-3`}>
      {widths.map((w, i) => (
        <div key={i} className={align[i] === "right" ? "flex justify-end" : ""}>
          <SkeletonBox className={`h-3.5 ${w}`} />
        </div>
      ))}
    </div>
  );
}

// A phone-width list/card row — name+meta on the left, a value stacked on
// the right, matching the mobile card shape Items (and, loading-state-only,
// Users/Customers) use below the `md` breakpoint.
// Matches <ComingSoon>'s centered heading + note shape, for the handful of
// not-yet-built routes that render nothing but that placeholder — keeps
// requireRole's session check from painting a blank page while it resolves.
export function SkeletonComingSoon() {
  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <div className="flex max-w-sm flex-col items-center gap-2.5">
        <SkeletonBox className="h-4.5 w-32" />
        <SkeletonBox className="mt-1 h-3 w-64" />
        <SkeletonBox className="h-3 w-48" />
      </div>
    </div>
  );
}

export function SkeletonCardRow() {
  return (
    <div className="border-b border-hairline px-4.5 py-3 md:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <SkeletonBox className="h-3.5 w-36" />
          <SkeletonBox className="mt-2 h-2.5 w-24" />
        </div>
        <div className="flex flex-none flex-col items-end gap-1.5">
          <SkeletonBox className="h-4 w-10" />
          <SkeletonBox className="h-2.5 w-14" />
        </div>
      </div>
      <SkeletonBox className="mt-3 h-3 w-full max-w-[220px]" />
    </div>
  );
}
