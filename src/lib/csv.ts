// Minimal RFC4180-ish CSV parser — no "server-only": the opening-stock-import
// form parses a manager's uploaded file client-side (so it can populate an
// editable preview before anything touches the server), and this needs to
// run in the browser. Handles quoted fields, embedded commas/newlines, and
// escaped quotes ("" inside a quoted field); doesn't handle exotic dialects
// (alternate delimiters, BOM stripping beyond a leading ﻿) since the
// only input is a manager's own Excel/Sheets export.
export function parseCsv(text: string): string[][] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

// Header-driven, not positional: a manager's own export won't reliably match
// one fixed column order. Matches case-insensitively, trims whitespace.
export function parseCsvAsRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = (row[i] ?? "").trim();
    });
    return record;
  });
}

// Export side of the same format — quotes a field only when it needs it
// (contains a comma, quote, or newline), doubling embedded quotes. CRLF line
// endings, matching what Excel/Sheets themselves write.
export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell);
          return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\r\n");
}
