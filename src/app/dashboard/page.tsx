import { requireRole } from "@/lib/auth/dal";
import { ManagerShellFrame } from "@/components/shell/manager-shell-frame";
import { ContentHeader } from "@/components/shell/content-header";
import { awaitingReviewSummary, outstandingBalanceSummary, reviewQueue, arrivalsUpcoming } from "@/lib/order-metrics";
import { recentShopSales } from "@/lib/shop-metrics";
import { lowStockSummary } from "@/lib/stock";
import { DashboardKpis } from "./kpi-cards";
import { ReviewTable } from "./review-table";
import { ArrivalsCard } from "./arrivals-card";
import { ShopSalesCard } from "./shop-sales-card";

export default async function DashboardPage() {
  const user = await requireRole(["manager"]);

  const [awaitingReview, outstanding, lowStock, queue, arrivals, shopSales] = await Promise.all([
    awaitingReviewSummary(),
    outstandingBalanceSummary(),
    lowStockSummary(),
    reviewQueue(),
    arrivalsUpcoming(14),
    recentShopSales(),
  ]);

  return (
    <ManagerShellFrame active="dashboard" user={user}>
      <ContentHeader
        title="Dashboard"
        subtitle={new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
        right={
          <a
            href="/dashboard/export"
            className="flex h-11 flex-none items-center rounded bg-dark px-4 font-sans text-[13px] font-medium text-white hover:opacity-90 md:h-[34px]"
          >
            Export
          </a>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6.5">
        <div className="flex flex-col gap-4">
          <DashboardKpis awaitingReview={awaitingReview} outstanding={outstanding} lowStock={lowStock} />
          <div className="flex flex-col gap-4 md:grid md:grid-cols-[1.55fr_1fr] md:items-start">
            <ReviewTable rows={queue} />
            <div className="flex flex-col gap-4">
              <ArrivalsCard arrivals={arrivals} />
              <ShopSalesCard
                total={shopSales.total}
                dailyTotals={shopSales.dailyTotals}
                underPriceCount={shopSales.underPriceCount}
              />
            </div>
          </div>
        </div>
      </div>
    </ManagerShellFrame>
  );
}
