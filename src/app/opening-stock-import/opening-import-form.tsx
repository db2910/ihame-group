"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { parseCsvAsRecords } from "@/lib/csv";
import { importOpeningStockAction, type ImportFormState } from "./actions";

const UNITS = ["piece", "metre", "kg", "bag", "litre", "box"] as const;

const labelClass = "font-sans text-[12.5px] font-medium tracking-[0.04em] text-ink-muted uppercase";
const fieldClass =
  // 16px on mobile (text-base), not text-sm's 14px — iOS Safari force-zooms
  // the viewport when a focused input renders under 16px. Same convention
  // as the Items form.
  "focus-ring-brand h-11 w-full rounded border border-input-border px-3 font-sans text-base text-ink outline-none md:h-9 md:text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

type Row = {
  key: number;
  sku: string;
  name: string;
  category: string;
  unit: string;
  sellPrice: string;
  reorderLevel: string;
  quantity: string;
  unitCost: string;
};

let nextRowKey = 0;
function emptyRow(): Row {
  return {
    key: nextRowKey++,
    sku: "",
    name: "",
    category: "",
    unit: "piece",
    sellPrice: "",
    reorderLevel: "0",
    quantity: "",
    unitCost: "",
  };
}

// Matches a CSV header against a field by any of its accepted spellings —
// a manager's own export is far more likely to say "Sell Price" or "Cost"
// than to match one exact column name.
const HEADER_ALIASES: Record<keyof Omit<Row, "key">, string[]> = {
  sku: ["sku"],
  name: ["name", "item", "item name"],
  category: ["category"],
  unit: ["unit"],
  sellPrice: ["sellprice", "sell price", "sell"],
  reorderLevel: ["reorderlevel", "reorder level", "reorder"],
  quantity: ["quantity", "qty"],
  unitCost: ["unitcost", "unit cost", "cost"],
};

function recordToRow(record: Record<string, string>): Row {
  const get = (field: keyof Omit<Row, "key">) => {
    for (const alias of HEADER_ALIASES[field]) {
      if (record[alias] !== undefined) return record[alias];
    }
    return "";
  };
  return {
    key: nextRowKey++,
    sku: get("sku"),
    name: get("name"),
    category: get("category"),
    unit: UNITS.includes(get("unit") as (typeof UNITS)[number]) ? get("unit") : "piece",
    sellPrice: get("sellPrice"),
    reorderLevel: get("reorderLevel") || "0",
    quantity: get("quantity"),
    unitCost: get("unitCost"),
  };
}

const CSV_TEMPLATE =
  "sku,name,category,unit,sellPrice,reorderLevel,quantity,unitCost\n" +
  ",Galvanised nail 3in,Fasteners,kg,1800,50,240,1450\n";

function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "opening-stock-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function RowCard({
  index,
  row,
  removable,
  onChange,
  onRemove,
}: {
  index: number;
  row: Row;
  removable: boolean;
  onChange: (row: Row) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded border border-hairline-2 bg-app px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className={labelClass}>Row {index + 1}</div>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="cursor-pointer font-sans text-[12.5px] text-ink-faint hover:text-alert"
          >
            Remove
          </button>
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="SKU">
          <input
            name="sku"
            placeholder="Auto"
            value={row.sku}
            onChange={(e) => onChange({ ...row, sku: e.target.value })}
            className={`${fieldClass} font-mono`}
          />
        </Field>
        <Field label="Name">
          <input
            name="name"
            required
            value={row.name}
            onChange={(e) => onChange({ ...row, name: e.target.value })}
            className={fieldClass}
          />
        </Field>
        <Field label="Category">
          <input
            name="category"
            required
            value={row.category}
            onChange={(e) => onChange({ ...row, category: e.target.value })}
            className={fieldClass}
          />
        </Field>
        <Field label="Unit">
          <select
            name="unit"
            value={row.unit}
            onChange={(e) => onChange({ ...row, unit: e.target.value })}
            className={fieldClass}
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sell price (RWF)">
          <input
            name="sellPrice"
            required
            inputMode="decimal"
            value={row.sellPrice}
            onChange={(e) => onChange({ ...row, sellPrice: e.target.value })}
            className={`${fieldClass} font-mono`}
          />
        </Field>
        <Field label="Reorder level">
          <input
            name="reorderLevel"
            inputMode="decimal"
            value={row.reorderLevel}
            onChange={(e) => onChange({ ...row, reorderLevel: e.target.value })}
            className={`${fieldClass} font-mono`}
          />
        </Field>
        <Field label="Quantity">
          <input
            name="quantity"
            required
            inputMode="decimal"
            value={row.quantity}
            onChange={(e) => onChange({ ...row, quantity: e.target.value })}
            className={`${fieldClass} font-mono`}
          />
        </Field>
        <Field label="Cost/unit (RWF)">
          <input
            name="unitCost"
            required
            inputMode="decimal"
            value={row.unitCost}
            onChange={(e) => onChange({ ...row, unitCost: e.target.value })}
            className={`${fieldClass} font-mono`}
          />
        </Field>
      </div>
    </div>
  );
}

function ErrorNote({ state }: { state: ImportFormState }) {
  if (!state || !("error" in state)) return null;
  return (
    <div className="rounded border border-warning-border bg-warning-bg px-3.5 py-2.5 font-sans text-[13.5px] text-warning-text">
      {state.error}
    </div>
  );
}

export function OpeningImportForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>(() => [emptyRow()]);

  const [state, action, pending] = useActionState<ImportFormState, FormData>(
    async (prevState, formData) => {
      const result = await importOpeningStockAction(prevState, formData);
      if (result && "success" in result) {
        showToast(`Imported ${result.count} item${result.count === 1 ? "" : "s"}`);
        router.refresh(); // the page itself is now locked — reflect that
      }
      return result;
    },
    undefined,
  );

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const records = parseCsvAsRecords(text);
    const parsedRows = records.map(recordToRow).filter((r) => r.name || r.category || r.quantity);
    if (parsedRows.length === 0) {
      showToast("No rows found in that file");
    } else {
      setRows((current) => {
        // A single still-empty starter row is just the default state, not
        // something the manager typed — replace it rather than leaving a
        // blank row mixed in with the real import.
        const base = current.length === 1 && !current[0].name && !current[0].category ? [] : current;
        return [...base, ...parsedRows];
      });
      showToast(`Loaded ${parsedRows.length} row${parsedRows.length === 1 ? "" : "s"} from CSV`);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-6.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-11 cursor-pointer items-center rounded border border-input-border px-3.5 font-sans text-[13.5px] font-medium text-ink-secondary hover:bg-row-hover md:h-9"
        >
          Upload CSV…
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleCsvUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={downloadCsvTemplate}
          className="flex h-11 cursor-pointer items-center font-sans text-[13.5px] font-medium text-brand md:h-9"
        >
          Download CSV template
        </button>
        <span className="font-sans text-[12.5px] text-ink-faint">
          Columns: sku (optional), name, category, unit, sellPrice, reorderLevel, quantity, unitCost
        </span>
      </div>

      <form action={action} className="flex min-h-0 flex-1 flex-col gap-4">
        <ErrorNote state={state} />

        <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto">
          {rows.map((row, index) => (
            <RowCard
              key={row.key}
              index={index}
              row={row}
              removable={rows.length > 1}
              onChange={(next) => setRows((rs) => rs.map((r) => (r.key === next.key ? next : r)))}
              onRemove={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
            />
          ))}
        </div>

        <div className="flex flex-none flex-wrap items-center justify-between gap-3 border-t border-hairline-2 pt-3.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRows((rs) => [...rs, emptyRow()])}
              className="flex cursor-pointer items-center gap-1.5 font-sans text-[13.5px] font-medium text-brand"
            >
              + Add row
            </button>
            <span className="font-sans text-[12.5px] text-ink-faint">
              {rows.length} row{rows.length === 1 ? "" : "s"}
            </span>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="flex h-11 cursor-pointer items-center gap-1.5 rounded bg-brand px-4 font-sans text-[13.5px] font-semibold text-white hover:bg-brand-hover disabled:opacity-70 md:h-9"
          >
            {pending && <Spinner className="h-3.5 w-3.5" />}
            {pending ? "Importing…" : "Import opening stock"}
          </button>
        </div>
        <div className="font-sans text-[12px] leading-[1.5] text-ink-faint">
          This can only be done once — after saving, this screen locks and further changes go
          through Purchases or Adjustments instead.
        </div>
      </form>
    </div>
  );
}
