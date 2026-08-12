import "server-only";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

/**
 * Shared Excel/PDF generation for every report's export button. Both pure
 * JS (no native build step, no headless browser) — same reasoning this
 * project already picked bcryptjs over a native bcrypt binding for. Mirrors
 * src/lib/csv.ts's existing export shape: the page and its export Route
 * Handler build the same rows from the same query, so a report's export can
 * never show something different from what's on screen.
 */

export type ReportExportData = {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: (string | number)[][];
  // Column indices that hold a magnitude (count/money/days), for the
  // on-screen table's right-alignment — not used by the Excel/PDF writers
  // below, which just dump cells left-to-right in reading order.
  alignRight?: number[];
};

export async function toExcelBuffer(data: ReportExportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "IHAME Group";
  wb.created = new Date();

  // Excel sheet names are capped at 31 characters and can't contain
  // []:*?/\ — a report title is free text, so it's sanitized rather than
  // trusted as a valid sheet name.
  const sheetName = data.title.replace(/[[\]:*?/\\]/g, "").slice(0, 31) || "Report";
  const sheet = wb.addWorksheet(sheetName);

  if (data.subtitle) {
    sheet.addRow([data.subtitle]);
    sheet.mergeCells(1, 1, 1, Math.max(data.columns.length, 1));
    sheet.getRow(1).font = { italic: true, color: { argb: "FF6B7178" } };
    sheet.addRow([]);
  }

  const headerRowIndex = sheet.rowCount + 1;
  sheet.addRow(data.columns);
  sheet.getRow(headerRowIndex).font = { bold: true };
  for (const row of data.rows) sheet.addRow(row);

  sheet.columns.forEach((col) => {
    col.width = 20;
  });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// Route Handlers hand a Node Buffer to `new Response(...)`, but @types/node's
// Buffer isn't structurally assignable to the DOM lib's BodyInit in this
// project's TS setup — converting to a plain Uint8Array (a real copy, not a
// view aliasing the Buffer) satisfies it without an unchecked cast.
export function bufferResponse(buf: Buffer, headers: Record<string, string>): Response {
  return new Response(new Uint8Array(buf), { headers });
}

const PAGE_MARGIN = 40;
const ROW_HEIGHT = 20;

export async function toPdfBuffer(data: ReportExportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: PAGE_MARGIN,
      size: "A4",
      // A wide report (many columns) reads better landscape; a short,
      // narrow one (e.g. a single-figure summary) stays portrait.
      layout: data.columns.length > 5 ? "landscape" : "portrait",
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(16).fillColor("#1A1A1A").text(data.title);
    if (data.subtitle) {
      doc.font("Helvetica").fontSize(10).fillColor("#6B7178").text(data.subtitle);
    }
    doc.moveDown(1);

    const startX = doc.page.margins.left;
    const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = usableWidth / Math.max(data.columns.length, 1);

    function drawRow(cells: (string | number)[], y: number, bold: boolean) {
      doc
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(9)
        .fillColor("#1A1A1A");
      cells.forEach((cell, i) => {
        doc.text(String(cell), startX + i * colWidth, y, { width: colWidth - 6, ellipsis: true, lineBreak: false });
      });
    }

    function drawHeader(y: number): number {
      drawRow(data.columns, y, true);
      const lineY = y + ROW_HEIGHT - 6;
      doc
        .moveTo(startX, lineY)
        .lineTo(startX + usableWidth, lineY)
        .strokeColor("#D5DADE")
        .stroke();
      return y + ROW_HEIGHT;
    }

    let y = drawHeader(doc.y);

    if (data.rows.length === 0) {
      doc.font("Helvetica").fontSize(9).fillColor("#8A9098").text("No rows for this period.", startX, y);
    }

    for (const row of data.rows) {
      if (y > doc.page.height - doc.page.margins.bottom - ROW_HEIGHT) {
        doc.addPage();
        y = drawHeader(doc.page.margins.top);
      }
      drawRow(row, y, false);
      y += ROW_HEIGHT;
    }

    doc.end();
  });
}
