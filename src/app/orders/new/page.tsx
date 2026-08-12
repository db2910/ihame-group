import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { generateOrderNo } from "@/lib/order-no";
import { StaffTopBar } from "@/components/shell/staff-top-bar";
import { FREIGHT_STAFF_TABS } from "@/components/shell/staff-tabs";
import { OrderForm } from "../order-form";

export default async function NewOrderPage() {
  const user = await requireRole(["freight_staff"]);

  const [customers, nextOrderNo] = await Promise.all([
    db.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, code: true, name: true } }),
    // Preview only — the real number is assigned at save time by the same
    // generator, so a concurrent save could take this one. Shown because the
    // mock puts it in the header, and it lets staff quote a reference while
    // still filling the form in.
    generateOrderNo(),
  ]);

  return (
    <StaffTopBar role="freight_staff" user={user} tabs={FREIGHT_STAFF_TABS} active="new-order">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto w-full max-w-[820px]">
          <OrderForm customers={customers} orderNoLabel={`${nextOrderNo} · DRAFT`} />
        </div>
      </div>
    </StaffTopBar>
  );
}
