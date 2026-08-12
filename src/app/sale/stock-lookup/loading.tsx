import { StaffTopBar } from "@/components/shell/staff-top-bar";
import { SHOP_STAFF_TABS } from "@/components/shell/staff-tabs";
import { SkeletonBox } from "@/components/ui/skeleton";

function Row() {
  return (
    <div className="flex items-center gap-3 border-b border-hairline px-4.5 py-3.5">
      <div className="min-w-0 flex-1">
        <SkeletonBox className="h-3.5 w-40" />
        <SkeletonBox className="mt-2 h-2.5 w-28" />
      </div>
      <div className="flex flex-none flex-col items-end gap-1.5">
        <SkeletonBox className="h-4 w-10" />
        <SkeletonBox className="h-2.5 w-8" />
      </div>
    </div>
  );
}

export default function StockLookupLoading() {
  return (
    <StaffTopBar role="shop_staff" user={{ name: "…" }} tabs={SHOP_STAFF_TABS} active="stock-lookup">
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 p-4 md:p-5.5">
        <div>
          <SkeletonBox className="h-5 w-32" />
          <SkeletonBox className="mt-2 h-3 w-48" />
        </div>
        <SkeletonBox className="h-11 w-full flex-none md:h-[34px]" />
        <div className="min-h-0 flex-1 overflow-hidden rounded-[5px] border border-border bg-card">
          {Array.from({ length: 10 }).map((_, i) => (
            <Row key={i} />
          ))}
        </div>
      </div>
    </StaffTopBar>
  );
}
