import { ManagerShell } from "@/components/shell/manager-shell";
import { ContentHeader } from "@/components/shell/content-header";
import { SkeletonBox } from "@/components/ui/skeleton";

// Users has no separate mobile layout (unlike Items) — its grid renders as
// one fixed template at every width, just with responsive font sizes — so
// this mirrors that directly instead of also drawing a phone-card variant.
const GRID = "grid-cols-[1.4fr_1.6fr_1fr_.9fr_.9fr_1fr]";

function Row() {
  return (
    <div className={`grid ${GRID} items-center gap-2 border-b border-hairline px-4.5 py-3`}>
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="shimmer h-7 w-7 flex-none rounded-full" />
        <SkeletonBox className="h-3.5 w-20" />
      </div>
      <SkeletonBox className="h-3.5 w-32" />
      <SkeletonBox className="h-[19px] w-20 rounded-[11px]" />
      <div className="flex items-center gap-1.5">
        <div className="shimmer h-[7px] w-[7px] flex-none rounded-full" />
        <SkeletonBox className="h-3.5 w-12" />
      </div>
      <SkeletonBox className="h-3.5 w-24" />
      <div className="flex flex-col items-end gap-1.5">
        <SkeletonBox className="h-3.5 w-24" />
      </div>
    </div>
  );
}

export default function UsersLoading() {
  return (
    <ManagerShell active="users" user={{ name: "…" }}>
      <ContentHeader
        title="Users"
        right={<div className="shimmer h-11 w-[140px] rounded md:h-[34px]" />}
      />
      <div className="min-h-0 flex-1 p-6.5">
        <div className="flex flex-col overflow-hidden rounded-[5px] border border-border bg-card">
          <div
            className={`grid ${GRID} gap-2 border-b border-hairline-2 bg-row-hover px-4.5 py-2.5 font-mono text-[11.5px] font-medium tracking-[0.06em] text-ink-faint`}
          >
            <div>NAME</div>
            <div>EMAIL</div>
            <div>ROLE</div>
            <div>STATUS</div>
            <div>LAST ACTIVE</div>
            <div className="text-right">ACTIONS</div>
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <Row key={i} />
          ))}
        </div>
      </div>
    </ManagerShell>
  );
}
