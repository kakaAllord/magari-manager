import "server-only";
import ExcelJS from "exceljs";
import { formatDay, type ReportParams } from "@/lib/report-params";
import type { ExpenseRow, Summary } from "@/lib/reports";

const MONEY = '"TSh" #,##0';
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6EDFC" } };

// "2026-09-29 14:05" (Tanzanian time) -> a Date whose UTC fields match, which Excel shows as-is.
const excelDate = (local: string) => {
  const [d, t] = local.split(" ");
  const [y, mo, da] = d.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, da, h, mi));
};

const groupName = { car: "gari", month: "mwezi", week: "wiki" } as const;

export function reportFilename(p: ReportParams) {
  return `matumizi-ya-magari_${p.from}_hadi_${p.to}_kwa-${groupName[p.group]}.xlsx`;
}

export async function buildWorkbook(
  p: ReportParams,
  summary: Summary,
  expenses: ExpenseRow[],
  carsLabel: string,
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Magari";
  wb.created = new Date();

  // Summary sheet
  const s = wb.addWorksheet("Muhtasari", { views: [{ state: "frozen", ySplit: 4 }] });
  s.addRow([`Matumizi ya magari · ${formatDay(p.from)} hadi ${formatDay(p.to)}`]).font = { bold: true, size: 14 };
  s.addRow([`Magari: ${carsLabel} · Kwa ${groupName[p.group]} · Maombi yaliyokubaliwa, kwa tarehe ya kukubaliwa (saa za Tanzania)`]).font = {
    color: { argb: "FF5F6673" },
  };
  s.addRow([]);

  if (p.group === "car") {
    const header = s.addRow(["Namba", "Gari", "Maombi", "Jumla"]);
    for (const r of summary.rows as (Summary["rows"][number] & { sub?: string })[]) {
      s.addRow([r.label, r.sub ?? "", r.count, r.total]);
    }
    const total = s.addRow(["Jumla", "", summary.count, summary.grandTotal]);
    styleTable(s, header, total, [12, 24, 12, 18], [4]);
  } else {
    const header = s.addRow([p.group === "month" ? "Mwezi" : "Wiki", ...summary.columns.map((c) => c.label), "Jumla"]);
    for (const r of summary.rows) s.addRow([r.label, ...r.values, r.total]);
    const total = s.addRow(["Jumla", ...summary.totals, summary.grandTotal]);
    const moneyCols = summary.columns.map((_, i) => i + 2).concat(summary.columns.length + 2);
    styleTable(s, header, total, [24, ...summary.columns.map(() => 16), 18], moneyCols);
  }

  // Expenses sheet: every approved request, filterable
  const e = wb.addWorksheet("Matumizi", { views: [{ state: "frozen", ySplit: 1 }] });
  e.columns = [
    { header: "Imekubaliwa", key: "approved", width: 18, style: { numFmt: "dd mmm yyyy hh:mm" } },
    { header: "Iliombwa", key: "requested", width: 18, style: { numFmt: "dd mmm yyyy hh:mm" } },
    { header: "Namba", key: "plate", width: 12 },
    { header: "Gari", key: "car", width: 20 },
    { header: "Dereva", key: "driver", width: 20 },
    { header: "Sababu", key: "reason", width: 40 },
    { header: "Kiasi", key: "amount", width: 16, style: { numFmt: MONEY } },
    { header: "Imekubaliwa na", key: "by", width: 20 },
  ];
  for (const x of expenses) {
    e.addRow({
      approved: excelDate(x.approved_at),
      requested: excelDate(x.requested_at),
      plate: x.plate ?? "Hakuna gari",
      car: x.car ?? "",
      driver: x.driver,
      reason: x.reason,
      amount: Number(x.amount),
      by: x.approved_by ?? "",
    });
  }
  const eh = e.getRow(1);
  eh.font = { bold: true };
  eh.eachCell((c) => (c.fill = HEADER_FILL));
  e.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, expenses.length + 1), column: 8 } };

  return Buffer.from(await wb.xlsx.writeBuffer());
}

function styleTable(s: ExcelJS.Worksheet, header: ExcelJS.Row, total: ExcelJS.Row, widths: number[], moneyCols: number[]) {
  widths.forEach((w, i) => (s.getColumn(i + 1).width = w));
  header.font = { bold: true };
  header.eachCell((c) => (c.fill = HEADER_FILL));
  total.font = { bold: true };
  total.eachCell((c) => (c.border = { top: { style: "thin" } }));
  for (const col of moneyCols) {
    for (let r = header.number + 1; r <= total.number; r++) s.getCell(r, col).numFmt = MONEY;
  }
}
