"use client";

import { useState, useTransition } from "react";
import { EditItemModal, type CategoryOption, type ItemFormValues } from "./item-form-modal";
import { toggleItemActiveAction } from "./actions";
import { showToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { GRID } from "./grid";

export type ItemRow = ItemFormValues & {
  categoryName: string;
  costPrice: string;
  onHand: string;
  isActive: boolean;
  isLow: boolean;
};

function InactivePill() {
  return (
    <span className="flex-none rounded-[9px] bg-[#EEF0F2] px-1.5 py-px font-mono text-[12.5px] text-ink-muted">
      INACTIVE
    </span>
  );
}

export function ItemsTable({
  items,
  categories,
  pagination,
}: {
  items: ItemRow[];
  categories: CategoryOption[];
  pagination?: React.ReactNode;
}) {
  const [editing, setEditing] = useState<ItemRow | null>(null);
  const [togglePending, startToggle] = useTransition();

  function handleToggle(item: ItemRow) {
    const formData = new FormData();
    formData.set("itemId", item.id);
    startToggle(async () => {
      await toggleItemActiveAction(formData);
      showToast(item.isActive ? "Item deactivated" : "Item reactivated");
      setEditing(null);
    });
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[5px] border border-border bg-card">
        <div
          className={`hidden ${GRID} gap-2 border-b border-hairline-2 bg-row-hover px-4.5 py-2.5 font-mono text-[11.5px] font-medium tracking-[0.06em] text-ink-faint md:grid`}
        >
          <div>SKU</div>
          <div>ITEM</div>
          <div>CATEGORY</div>
          <div>UNIT</div>
          <div className="text-right">COST</div>
          <div className="text-right">SELL</div>
          <div className="text-right">ON HAND</div>
          <div className="text-right">REORDER</div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {items.length === 0 && (
            <div className="px-4.5 py-8 text-center font-sans text-[15px] text-ink-faint">
              No items match. Add one above, or clear the search.
            </div>
          )}
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setEditing(item)}
              className={`block w-full border-b border-hairline px-4.5 py-3 text-left font-sans text-[15px] text-ink last:border-b-0 hover:bg-row-hover md:py-3 ${
                item.isActive ? "" : "opacity-55"
              }`}
            >
              {/* Desktop: the mock's 8-column grid. */}
              <div className={`hidden ${GRID} items-center gap-2 md:grid`}>
                <div className="min-w-0 truncate font-mono text-[13.5px] text-ink-secondary">{item.sku}</div>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{item.name}</span>
                  {!item.isActive && <InactivePill />}
                </div>
                <div className="min-w-0 truncate text-ink-secondary">{item.categoryName}</div>
                <div className="text-ink-secondary">{item.unit}</div>
                <div className="text-right font-mono text-[13.5px] text-ink-secondary">
                  {item.costPrice}
                </div>
                <div className="text-right font-mono text-[13.5px]">{item.sellPrice}</div>
                <div
                  className={`text-right font-mono text-[14px] font-semibold ${
                    item.isLow ? "text-alert" : "text-ink"
                  }`}
                >
                  {item.onHand}
                </div>
                <div className="text-right font-mono text-[13.5px] text-ink-faint">
                  {item.reorderLevel}
                </div>
              </div>

              {/* Phone: eight columns can't survive 390px. Name/meta and
                  on-hand/minimum stack as two right-aligned lines, cost/sell
                  drop to their own row underneath. */}
              <div className="md:hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-sans text-[15px] font-medium">{item.name}</span>
                      {!item.isActive && <InactivePill />}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[12px] text-ink-faint">
                      {item.sku} · {item.categoryName}
                    </div>
                  </div>
                  <div className="flex-none text-right">
                    <div
                      className={`font-mono text-[18px] leading-none font-semibold ${
                        item.isLow ? "text-alert" : "text-ink"
                      }`}
                    >
                      {item.onHand}
                    </div>
                    <div className="mt-1 font-mono text-[11.5px] leading-none text-ink-faint">
                      of {item.reorderLevel} min
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-baseline justify-between font-mono text-[13.5px]">
                  <span className="text-ink-secondary">
                    <span className="text-ink-faint">Cost </span>
                    {item.costPrice}
                  </span>
                  <span className="text-ink">
                    <span className="text-ink-faint">Sell </span>
                    {item.sellPrice}
                    <span className="text-ink-faint"> /{item.unit}</span>
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="hidden flex-none border-t border-hairline px-4.5 py-2.5 font-sans text-[14px] text-ink-faint md:block">
          Cost price follows the item&rsquo;s most recent purchase. Stock on hand is the sum of
          the movements ledger.
        </div>
        {pagination}
      </div>

      {editing && (
        <EditItemModal
          item={editing}
          categories={categories}
          open
          onClose={() => setEditing(null)}
          deactivate={
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-hairline-2 pt-3.5">
              <span className="font-sans text-[12.5px] leading-[1.4] text-ink-faint">
                {editing.isActive
                  ? "Items are deactivated, never deleted — the ledger still references them."
                  : "This item is hidden from the sale screen until it is reactivated."}
              </span>
              <button
                type="button"
                onClick={() => handleToggle(editing)}
                disabled={togglePending}
                className={`flex flex-none cursor-pointer items-center gap-1.5 rounded border px-3 py-1.5 font-sans text-[14px] font-medium disabled:cursor-default disabled:opacity-70 ${
                  editing.isActive
                    ? "border-warning-border text-alert hover:bg-warning-bg"
                    : "border-border text-ink-secondary hover:bg-row-hover"
                }`}
              >
                {togglePending && <Spinner className="h-3.5 w-3.5" />}
                {togglePending
                  ? editing.isActive
                    ? "Deactivating…"
                    : "Reactivating…"
                  : editing.isActive
                    ? "Deactivate"
                    : "Reactivate"}
              </button>
            </div>
          }
        />
      )}
    </>
  );
}
