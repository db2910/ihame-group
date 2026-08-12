import { ManagerShell } from "@/components/shell/manager-shell";
import { ContentHeader } from "@/components/shell/content-header";
import { SkeletonBox } from "@/components/ui/skeleton";

// This route resolves to one of two very different shapes — the one-time
// import form, or a locked notice once it's already been run — so unlike the
// other loading states this doesn't try to mirror either exactly. A neutral
// centered block avoids committing to the wrong one and still kills the
// blank-white gap while `requireRole` and the "already imported?" check run.
export default function OpeningStockImportLoading() {
  return (
    <ManagerShell active="opening-stock-import" user={{ name: "…" }}>
      <ContentHeader
        title="Opening stock import"
        subtitle="One-time bulk load of your existing catalogue and its current stock"
      />
      <div className="flex flex-1 items-center justify-center p-10">
        <div className="flex w-full max-w-sm flex-col items-center gap-2.5">
          <SkeletonBox className="h-4 w-40" />
          <SkeletonBox className="h-3 w-full" />
          <SkeletonBox className="h-3 w-5/6" />
        </div>
      </div>
    </ManagerShell>
  );
}
