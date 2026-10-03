import "server-only";
import ExcelJS from "exceljs";
import { COMPANY } from "@/lib/company";
import { formatDay, type ReportParams } from "@/lib/report-params";
import type { ExpenseRow, IncomeRow, IncomeSummary, Summary } from "@/lib/reports";

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
  return `mapato-na-matumizi_${p.from}_hadi_${p.to}_kwa-${groupName[p.group]}.xlsx`;
}

export async function buildWorkbook(
  p: ReportParams,
  summary: Summary,
  expenses: ExpenseRow[],
  income: IncomeSummary,
  incomes: IncomeRow[],
  carsLabel: string,
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = COMPANY;
  wb.created = new Date();

  // Summary sheet: the totals, then the expenses table, then the income table.
  const s = wb.addWorksheet("Muhtasari");
  const note = { color: { argb: "FF5F6673" } };
  s.addRow([COMPANY]).font = { bold: true, size: 12 };
  s.addRow([`Mapato na matumizi · ${formatDay(p.from)} hadi ${formatDay(p.to)}`]).font = { bold: true, size: 14 };
  s.addRow([`Magari: ${carsLabel} · Kwa ${groupName[p.group]} · Saa za Tanzania`]).font = note;
  s.addRow([]);
  const totals = [
    s.addRow(["Mapato", income.total]),
    s.addRow(["Matumizi", summary.grandTotal]),
    s.addRow(["Salio", income.total - summary.grandTotal]),
  ];
  for (const r of totals) {
    r.getCell(1).font = { bold: true };
    r.getCell(2).numFmt = MONEY;
  }
  if (p.carIds.length) s.addRow(["Mapato na matumizi ni ya magari yaliyochaguliwa tu."]).font = note;
  s.addRow([]);

  s.addRow(["Matumizi"]).font = { bold: true, size: 12 };
  s.addRow(["Pesa zilizotolewa na mhasibu, kwa tarehe ya kutolewa"]).font = note;

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

  s.addRow([]);
  s.addRow(["Mapato"]).font = { bold: true, size: 12 };
  s.addRow([p.group === "car" ? "Kwa chanzo, kwa tarehe ya kurekodiwa" : "Kwa tarehe ya kurekodiwa"]).font = note;
  {
    const header = s.addRow([p.group === "car" ? "Chanzo" : p.group === "month" ? "Mwezi" : "Wiki", "Mara", "Jumla"]);
    for (const r of income.rows) s.addRow([r.label, r.count, r.total]);
    const total = s.addRow(["Jumla", income.count, income.total]);
    styleTable(s, header, total, [28, 10, 18], [3]);
  }

  // Expenses sheet: every issued request, filterable
  const e = wb.addWorksheet("Matumizi", { views: [{ state: "frozen", ySplit: 1 }] });
  e.columns = [
    { header: "Imetolewa", key: "issued", width: 18, style: { numFmt: "dd mmm yyyy hh:mm" } },
    { header: "Imekubaliwa", key: "approved", width: 18, style: { numFmt: "dd mmm yyyy hh:mm" } },
    { header: "Iliombwa", key: "requested", width: 18, style: { numFmt: "dd mmm yyyy hh:mm" } },
    { header: "Namba", key: "plate", width: 12 },
    { header: "Gari", key: "car", width: 20 },
    { header: "Aliyeomba", key: "requester", width: 20 },
    { header: "Sababu", key: "reason", width: 40 },
    { header: "Kiasi", key: "amount", width: 16, style: { numFmt: MONEY } },
    { header: "Imekubaliwa na", key: "approvedBy", width: 20 },
    { header: "Imetolewa na", key: "issuedBy", width: 20 },
    { header: "Kumbukumbu", key: "note", width: 24 },
  ];
  for (const x of expenses) {
    e.addRow({
      issued: excelDate(x.issued_at),
      approved: excelDate(x.approved_at),
      requested: excelDate(x.requested_at),
      plate: x.plate ?? "Hakuna gari",
      car: x.car ?? "",
      requester: x.requester,
      reason: x.reason,
      amount: Number(x.amount),
      approvedBy: x.approved_by ?? "",
      issuedBy: x.issued_by ?? "",
      note: x.issue_note ?? "",
    });
  }
  const eh = e.getRow(1);
  eh.font = { bold: true };
  eh.eachCell((c) => (c.fill = HEADER_FILL));
  e.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, expenses.length + 1), column: 11 } };

  // Income sheet: every entry in the period, filterable
  const i = wb.addWorksheet("Mapato", { views: [{ state: "frozen", ySplit: 1 }] });
  i.columns = [
    { header: "Imerekodiwa", key: "recorded", width: 18, style: { numFmt: "dd mmm yyyy hh:mm" } },
    { header: "Chanzo", key: "source", width: 30 },
    { header: "Maelezo", key: "description", width: 40 },
    { header: "Kiasi", key: "amount", width: 16, style: { numFmt: MONEY } },
    { header: "Imerekodiwa na", key: "by", width: 20 },
  ];
  for (const x of incomes) {
    i.addRow({
      recorded: excelDate(x.recorded_at),
      source: x.source,
      description: x.description ?? "",
      amount: Number(x.amount),
      by: x.recorded_by ?? "",
    });
  }
  const ih = i.getRow(1);
  ih.font = { bold: true };
  ih.eachCell((c) => (c.fill = HEADER_FILL));
  i.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, incomes.length + 1), column: 5 } };

  return Buffer.from(await wb.xlsx.writeBuffer());
}

function styleTable(s: ExcelJS.Worksheet, header: ExcelJS.Row, total: ExcelJS.Row, widths: number[], moneyCols: number[]) {
  widths.forEach((w, i) => (s.getColumn(i + 1).width = Math.max(w, s.getColumn(i + 1).width ?? 0)));
  header.font = { bold: true };
  header.eachCell((c) => (c.fill = HEADER_FILL));
  total.font = { bold: true };
  total.eachCell((c) => (c.border = { top: { style: "thin" } }));
  for (const col of moneyCols) {
    for (let r = header.number + 1; r <= total.number; r++) s.getCell(r, col).numFmt = MONEY;
  }
}
