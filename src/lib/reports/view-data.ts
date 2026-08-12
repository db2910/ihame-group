import "server-only";
import type { ReportExportData } from "./export";
import { type Period, formatCurrencyAmounts, reportDate, monthLabel } from "./shared";
import { reportMeta, type ReportKey } from "./registry";
import {
  ordersPerMonth,
  outstandingBalancesByCustomer,
  ordersPerStaffMember,
  averageTransitTime,
  topCustomersByValue,
} from "./freight";
import { dailyMonthlySales, overallProfit, slowMovers, underPriceSales } from "./shop";
import { monthlySummary, salesPerStaffMember, exchangeRateImpact } from "./combined";

const money = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * One function per report, all funnelling into the same {columns, rows}
 * shape (`ReportExportData`, from src/lib/reports/export.ts) — the detail
 * page and its Excel/PDF export both call this exact function, so a report
 * can never show something on screen that its export doesn't also contain
 * (same guarantee Phase 5's CSV exports already established).
 */
export async function buildReportData(key: ReportKey, period: Period): Promise<ReportExportData> {
  const meta = reportMeta(key);
  const title = meta?.name ?? key;
  const subtitle = meta ? `${meta.description}${meta.periodScoped ? ` · ${monthLabel(period)}` : " · all time"}` : undefined;

  switch (key) {
    case "orders-per-month": {
      const rows = await ordersPerMonth(12);
      return {
        title,
        subtitle,
        columns: ["Month", "Orders", "Value"],
        rows: rows.map((r) => [r.monthLabel, r.count, formatCurrencyAmounts(r.value)]),
        alignRight: [1, 2],
      };
    }

    case "outstanding-balances": {
      const rows = await outstandingBalancesByCustomer();
      return {
        title,
        subtitle,
        columns: ["Customer", "Orders", "Balance"],
        rows: rows.map((r) => [r.customerName, r.orderCount, formatCurrencyAmounts(r.balances)]),
        alignRight: [1, 2],
      };
    }

    case "orders-per-staff": {
      const rows = await ordersPerStaffMember(period);
      return {
        title,
        subtitle,
        columns: ["Staff", "Orders", "Value"],
        rows: rows.map((r) => [r.staffName, r.count, formatCurrencyAmounts(r.value)]),
        alignRight: [1, 2],
      };
    }

    case "avg-transit-time": {
      const rows = await averageTransitTime();
      return {
        title,
        subtitle,
        columns: ["Destination", "Avg. transit (days)", "Orders sampled"],
        rows: rows.map((r) => [r.destination, r.avgDays, r.sampleSize]),
        alignRight: [1, 2],
      };
    }

    case "top-customers": {
      const rows = await topCustomersByValue(20);
      return {
        title,
        subtitle,
        columns: ["Customer", "Orders", "Value"],
        rows: rows.map((r) => [r.customerName, r.orderCount, formatCurrencyAmounts(r.value)]),
        alignRight: [1, 2],
      };
    }

    case "daily-monthly-sales": {
      const data = await dailyMonthlySales(period);
      return {
        title,
        subtitle: `${subtitle} · ${data.monthCount} sale${data.monthCount === 1 ? "" : "s"}, RWF ${money.format(Number(data.monthTotal))} total`,
        columns: ["Date", "Sales", "Revenue (RWF)"],
        rows: data.days.map((d) => [reportDate.format(d.date), d.count, money.format(Number(d.revenue))]),
        alignRight: [1, 2],
      };
    }

    case "overall-profit": {
      const p = await overallProfit(period);
      return {
        title,
        subtitle: `${subtitle} · cash-basis, not accrual — see backlog.md's Phase 6 scope decision`,
        columns: ["Metric", "Amount (RWF)"],
        rows: [
          ["Sale revenue", money.format(Number(p.revenue))],
          ["Purchase spend", `−${money.format(Number(p.purchaseSpend))}`],
          ["Opening stock cost", `−${money.format(Number(p.openingStockCost))}`],
          ["Profit", money.format(Number(p.profit))],
        ],
        alignRight: [1],
      };
    }

    case "slow-movers": {
      const rows = await slowMovers(60);
      return {
        title,
        subtitle,
        columns: ["Item", "SKU", "Last sale", "Days since"],
        rows: rows.map((r) => [r.name, r.sku, r.lastSaleAt ? reportDate.format(r.lastSaleAt) : "Never sold", r.daysSince ?? "—"]),
        alignRight: [3],
      };
    }

    case "under-price-sales": {
      const rows = await underPriceSales(period);
      return {
        title,
        subtitle,
        columns: ["Date", "Sale", "Item", "SKU", "Qty", "Charged", "Sell price", "Staff"],
        rows: rows.map((r) => [
          reportDate.format(r.at),
          r.saleNo,
          r.itemName,
          r.sku,
          Number(r.quantity),
          money.format(Number(r.unitPrice)),
          money.format(Number(r.sellPrice)),
          r.staffName,
        ]),
        alignRight: [4, 5, 6],
      };
    }

    case "monthly-summary": {
      const s = await monthlySummary(period);
      // Freight/Shop revenue and Total cash in are all scoped to the
      // selected month; Receivables is deliberately NOT (see kpis.ts's
      // receivables() comment) — it's "what's owed as of right now",
      // across every open order, not just this month's. A payment made
      // in a later month can (correctly) shrink Receivables below what
      // "this month's revenue minus this month's cash in" would suggest,
      // which reads as a discrepancy unless the row says so outright.
      const rows: (string | number)[][] = [
        ...(s.freightRevenue.length === 0
          ? [["Freight revenue (this period)", "—"]]
          : s.freightRevenue.map((a) => [`Freight revenue (${a.currency}, this period)`, formatCurrencyAmounts([a])])),
        ["Shop revenue (RWF, this period)", `RWF ${money.format(Number(s.shopRevenue))}`],
        ...(s.cashIn.length === 0
          ? [["Total cash in (this period)", "—"]]
          : s.cashIn.map((a) => [`Total cash in (${a.currency}, this period)`, formatCurrencyAmounts([a])])),
        ...(s.receivables.length === 0
          ? [["Receivables (as of today)", "—"]]
          : s.receivables.map((a) => [`Receivables (${a.currency}, as of today)`, formatCurrencyAmounts([a])])),
      ];
      return {
        title,
        subtitle: `${subtitle} — revenue and cash-in figures are scoped to the period above; Receivables is always as-of-today, so it can reflect payments made after the period closed`,
        columns: ["Metric", "Value"],
        rows,
        alignRight: [1],
      };
    }

    case "sales-per-staff": {
      const rows = await salesPerStaffMember(period);
      return {
        title,
        subtitle,
        columns: ["Staff", "Module", "Count", "Value"],
        rows: rows.map((r) => [
          r.staffName,
          r.module === "freight" ? "Freight" : "Shop",
          r.count,
          r.module === "freight" ? formatCurrencyAmounts(r.value) : `RWF ${money.format(Number(r.value))}`,
        ]),
        alignRight: [2, 3],
      };
    }

    case "exchange-rate-impact": {
      const rows = await exchangeRateImpact(period);
      return {
        title,
        subtitle,
        columns: ["Order", "Paid on", "Amount", "Currency", "Rate", "Recorded by"],
        rows: rows.map((r) => [
          r.orderNo,
          reportDate.format(r.paidOn),
          money.format(Number(r.amount)),
          r.currency,
          Number(r.exchangeRate).toString(),
          r.recordedBy,
        ]),
        alignRight: [2, 4],
      };
    }

    default: {
      // Exhaustiveness guard: TS errors here if a ReportKey is ever added to
      // the registry without a matching case above.
      const exhaustive: never = key;
      throw new Error(`No report view defined for "${exhaustive}".`);
    }
  }
}
