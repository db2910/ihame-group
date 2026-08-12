import { StaffTopBar } from "@/components/shell/staff-top-bar";
import { FREIGHT_STAFF_TABS } from "@/components/shell/staff-tabs";
import { SkeletonBox } from "@/components/ui/skeleton";

// Literal class strings, not `md:grid-cols-${n}` — Tailwind extracts classes
// statically from source, so an interpolated name is never generated.
const COLS = {
  2: "md:grid-cols-2",
  4: "md:grid-cols-4",
} as const;

function Section({ cols, rows = 1 }: { cols: 2 | 4; rows?: number }) {
  return (
    <div className="flex flex-col gap-3.5 rounded-[5px] border border-border bg-card p-5 md:px-6">
      <SkeletonBox className="h-3 w-24" />
      <div className={`grid grid-cols-2 gap-3 ${COLS[cols]}`}>
        {Array.from({ length: cols * rows }).map((_, i) => (
          <SkeletonBox key={i} className="h-[42px] w-full" />
        ))}
      </div>
    </div>
  );
}

export default function NewOrderLoading() {
  return (
    <StaffTopBar role="freight_staff" user={{ name: "…" }} tabs={FREIGHT_STAFF_TABS} active="new-order">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto flex w-full max-w-[820px] flex-col gap-3.5">
          <div className="flex items-baseline justify-between">
            <SkeletonBox className="h-5 w-32" />
            <SkeletonBox className="h-3 w-36" />
          </div>
          <Section cols={2} />
          <Section cols={4} />
          <Section cols={4} rows={2} />
          <Section cols={2} />
        </div>
      </div>
    </StaffTopBar>
  );
}
