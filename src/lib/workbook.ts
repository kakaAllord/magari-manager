import "server-only";
import ExcelJS from "exceljs";
import { COMPANY } from "@/lib/company";
import type { ReportParams } from "@/lib/report-params";
import { expenseCar, incomeCar, periodOfRow, type ReportData } from "@/lib/report-data";
import { addCharts, type ChartSpec } from "@/lib/xlsx-charts";

// The Excel report. Totals on Muhtasari are formulas over the Matumizi and Mapato sheets, so
// editing or filtering the data there flows into the summary and its charts.

const MONEY = '"TSh" #,##0';
const NUMBER = "#,##0";
const DECIMAL = "#,##0.0";
const DATE = "dd mmm yyyy hh:mm";

const COLOR = {
  ink: "FF14201D",
  muted: "FF5F6673",
  line: "FFE1E6E4",
  accent: "FF0F7B6C",
  accentSoft: "FFE2F3EF",
  in: "FF1F7A45",
  inSoft: "FFE3F4E9",
  out: "FFB86E00",
  outSoft: "FFFCF0D9",
  balance: "FF2357B5",
  balanceSoft: "FFE7EEFB",
  danger: "FFC22F2F",
  dangerSoft: "FFFCE8E8",
};
// Slice colours for the pies, without the alpha byte.
const PALETTE = ["0F7B6C", "D08A1A", "2357B5", "C22F2F", "7A4FB5", "1F7A45", "8A6D3B", "4A90A4", "B5487A", "5F6673"];

const groupName = { car: "gari", month: "mwezi", week: "wiki" } as const;

export function reportFilename(p: ReportParams, ext: "xlsx" | "pdf" = "xlsx") {
  return `zuraja_ripoti_${p.from}_hadi_${p.to}_kwa-${groupName[p.group]}.${ext}`;
}

// "2026-09-29 14:05" (Tanzanian time) -> a Date whose UTC fields match, which Excel shows as-is.
const excelDate = (local: string) => {
  const [d, t] = local.split(" ");
  const [y, mo, da] = d.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, da, h, mi));
};

const fill = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const quote = (sheet: string) => `'${sheet.replace(/'/g, "''")}'`;

export async function buildWorkbook(data: ReportData) {
  const wb = new ExcelJS.Workbook();
  wb.creator = COMPANY;
  wb.company = COMPANY;
  wb.title = `Ripoti ${data.rangeLabel}`;
  wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true;

  // Muhtasari comes first in the file but is filled last, once the data sheets know their ranges.
  const summary = wb.addWorksheet("Muhtasari", {
    properties: { tabColor: { argb: COLOR.accent } },
    views: [{ showGridLines: false }],
  });
  const spend = addSpendSheet(wb, data);
  const income = addIncomeSheet(wb, data);
  const fuelCharts = addFuelSheets(wb, data);
  const summaryCharts = fillSummarySheet(summary, data, spend, income);

  const file = await wb.xlsx.writeBuffer();
  return addCharts(Buffer.from(file), [...summaryCharts, ...fuelCharts]);
}

type DataRange = { sheet: string; rows: number; amountCol: string; carCol: string; periodCol: string; kindCol?: string };

// Every paid request, as a filterable Excel table.
function addSpendSheet(wb: ExcelJS.Workbook, data: ReportData): DataRange {
  const s = wb.addWorksheet("Matumizi", { views: [{ state: "frozen", ySplit: 1 }], properties: { tabColor: { argb: COLOR.out } } });
  const periodGroup = data.params.group === "week" ? "week" : "month";
  const rows = data.expenses.map((x, i) => [
    excelDate(x.issued_at),
    periodOfRow(x, periodGroup),
    expenseCar(x),
    x.car ?? "",
    x.kind === "fuel" ? "Mafuta" : "Mengineyo",
    x.requester,
    x.reason,
    Number(x.amount),
    x.approved_by ?? "",
    x.authorised_by ?? "",
    x.issued_by ?? "",
    x.issue_note ?? "",
    excelDate(x.requested_at),
    x.fuel_price ?? "",
    x.fuel_price ? { formula: `IF(N${i + 2}>0,H${i + 2}/N${i + 2},"")`, result: Number(x.amount) / x.fuel_price } : "",
  ]);
  s.addTable({
    name: "Matumizi",
    ref: "A1",
    headerRow: true,
    totalsRow: true,
    style: { theme: "TableStyleMedium7", showRowStripes: true },
    columns: [
      { name: "Imetolewa", filterButton: true, totalsRowLabel: "Jumla" },
      { name: data.periodName, filterButton: true },
      { name: "Namba", filterButton: true },
      { name: "Gari", filterButton: true },
      { name: "Aina", filterButton: true },
      { name: "Aliyeomba", filterButton: true },
      { name: "Sababu", filterButton: true },
      { name: "Kiasi", filterButton: true, totalsRowFunction: "sum" },
      { name: "Imekubaliwa na", filterButton: true },
      { name: "Imeidhinishwa na", filterButton: true },
      { name: "Imetolewa na", filterButton: true },
      { name: "Kumbukumbu", filterButton: true },
      { name: "Iliombwa", filterButton: true },
      { name: "Bei kwa lita", filterButton: true },
      { name: "Lita", filterButton: true },
    ],
    rows: rows.length ? rows : [[null, "", "", "", "", "", "Hakuna matumizi katika kipindi hiki", 0, "", "", "", "", null, "", ""]],
  });
  [18, 14, 12, 20, 12, 20, 40, 16, 20, 20, 20, 24, 18, 14, 10].forEach((w, i) => (s.getColumn(i + 1).width = w));
  s.getColumn(1).numFmt = DATE;
  s.getColumn(13).numFmt = DATE;
  s.getColumn(8).numFmt = MONEY;
  s.getColumn(14).numFmt = MONEY;
  s.getColumn(15).numFmt = DECIMAL;
  const n = Math.max(rows.length, 1);
  s.addConditionalFormatting({
    ref: `H2:H${n + 1}`,
    rules: [{ type: "dataBar", priority: 1, minLength: 0, maxLength: 100, cfvo: [{ type: "min" }, { type: "max" }], color: { argb: "FFF2C27A" } } as ExcelJS.DataBarRuleType],
  });
  setupPrint(s);
  return { sheet: "Matumizi", rows: n, amountCol: "H", carCol: "C", periodCol: "B", kindCol: "E" };
}

// Every income entry, as a filterable Excel table.
function addIncomeSheet(wb: ExcelJS.Workbook, data: ReportData): DataRange {
  const s = wb.addWorksheet("Mapato", { views: [{ state: "frozen", ySplit: 1 }], properties: { tabColor: { argb: COLOR.in } } });
  const periodGroup = data.params.group === "week" ? "week" : "month";
  const rows = data.incomes.map((x) => [
    excelDate(x.recorded_at),
    periodOfRow(x, periodGroup),
    incomeCar(x),
    x.car_id !== null ? (x.car ?? "") : x.source,
    x.destination ?? "",
    x.description ?? "",
    x.tonnes === null ? null : Number(x.tonnes),
    x.rate_per_tonne,
    Number(x.amount),
    x.recorded_by ?? "",
    x.customer_name ?? "",
    Number(x.owed),
  ]);
  s.addTable({
    name: "Mapato",
    ref: "A1",
    headerRow: true,
    totalsRow: true,
    style: { theme: "TableStyleMedium7", showRowStripes: true },
    columns: [
      { name: "Imerekodiwa", filterButton: true, totalsRowLabel: "Jumla" },
      { name: data.periodName, filterButton: true },
      { name: "Namba", filterButton: true },
      { name: "Gari au chanzo", filterButton: true },
      { name: "Kwenda", filterButton: true },
      { name: "Maelezo", filterButton: true },
      { name: "Tani", filterButton: true, totalsRowFunction: "sum" },
      { name: "Bei kwa tani", filterButton: true },
      { name: "Kiasi", filterButton: true, totalsRowFunction: "sum" },
      { name: "Imerekodiwa na", filterButton: true },
      { name: "Mteja (deni)", filterButton: true },
      { name: "Deni bado", filterButton: true, totalsRowFunction: "sum" },
    ],
    rows: rows.length ? rows : [[null, "", "", "", "", "Hakuna mapato katika kipindi hiki", null, null, 0, "", "", 0]],
  });
  [18, 14, 12, 24, 20, 40, 10, 14, 16, 20, 20, 14].forEach((w, i) => (s.getColumn(i + 1).width = w));
  s.getColumn(1).numFmt = DATE;
  s.getColumn(7).numFmt = "#,##0.##";
  s.getColumn(8).numFmt = MONEY;
  s.getColumn(9).numFmt = MONEY;
  s.getColumn(12).numFmt = MONEY;
  const n = Math.max(rows.length, 1);
  s.addConditionalFormatting({
    ref: `I2:I${n + 1}`,
    rules: [{ type: "dataBar", priority: 1, minLength: 0, maxLength: 100, cfvo: [{ type: "min" }, { type: "max" }], color: { argb: "FF8FD1A5" } } as ExcelJS.DataBarRuleType],
  });
  setupPrint(s);
  return { sheet: "Mapato", rows: n, amountCol: "I", carCol: "C", periodCol: "B" };
}

function fillSummarySheet(s: ExcelJS.Worksheet, data: ReportData, spend: DataRange, income: DataRange): ChartSpec[] {
  [16, 22, 18, 18, 18, 12, 10, 3].forEach((w, i) => (s.getColumn(i + 1).width = w));
  const range = (r: DataRange, c: string) => `${r.sheet}!$${c}$2:$${c}$${r.rows + 1}`;
  const spendAmounts = range(spend, spend.amountCol);
  const incomeAmounts = range(income, income.amountCol);

  s.getCell("A1").value = COMPANY;
  s.getCell("A1").font = { bold: true, size: 16, color: { argb: COLOR.accent } };
  s.getCell("A2").value = "Ripoti ya mapato na matumizi";
  s.getCell("A2").font = { bold: true, size: 13, color: { argb: COLOR.ink } };
  s.getCell("A3").value = `${data.rangeLabel} · ${data.carsLabel} · ${data.groupLabel}`;
  s.getCell("A3").font = { color: { argb: COLOR.muted } };
  s.getCell("A4").value = `Imetengenezwa ${data.createdLabel}. Saa za Tanzania. Jumla hizi ni fomula za karatasi za Matumizi na Mapato.`;
  s.getCell("A4").font = { italic: true, size: 9, color: { argb: COLOR.muted } };

  // The three headline numbers, each in its own colour.
  const kpis: [string, string, number, string, string][] = [
    ["Mapato", `SUM(${incomeAmounts})`, data.totals.income, COLOR.in, COLOR.inSoft],
    ["Matumizi", `SUM(${spendAmounts})`, data.totals.spend, COLOR.out, COLOR.outSoft],
    ["Salio", "B6-B7", data.totals.balance, COLOR.balance, COLOR.balanceSoft],
  ];
  kpis.forEach(([label, formula, result, color, soft], i) => {
    const r = 6 + i;
    const row = s.getRow(r);
    row.height = 24;
    s.getCell(`A${r}`).value = label;
    s.getCell(`B${r}`).value = { formula, result };
    s.getCell(`B${r}`).numFmt = MONEY;
    for (const c of ["A", "B"]) {
      s.getCell(`${c}${r}`).fill = fill(soft);
      s.getCell(`${c}${r}`).font = { bold: true, size: 13, color: { argb: color } };
      s.getCell(`${c}${r}`).alignment = { vertical: "middle" };
    }
  });
  s.getCell("C6").value = { formula: `COUNTIF(${incomeAmounts},">0")`, result: data.incomes.length };
  s.getCell("C7").value = { formula: `COUNTIF(${spendAmounts},">0")`, result: data.expenses.length };
  s.getCell("C6").numFmt = '0 "rekodi"';
  s.getCell("C7").numFmt = '0 "maombi"';
  s.getCell("C8").value = "Mapato toa matumizi";
  for (const c of ["C6", "C7", "C8"]) s.getCell(c).font = { color: { argb: COLOR.muted } };
  s.addConditionalFormatting({
    ref: "A8:B8",
    rules: [
      {
        type: "expression",
        priority: 1,
        formulae: ["$B$8<0"],
        style: { font: { color: { argb: COLOR.danger }, bold: true }, fill: { type: "pattern", pattern: "solid", bgColor: { argb: COLOR.dangerSoft } } },
      },
    ],
  });

  // Per car: income, spending, faida (or hasara) and request count, each a SUMIFS over the data sheets.
  let r = 10;
  const byCarStart = sectionHeader(s, r, "Kwa gari", ["Namba", "Gari", "Mapato", "Matumizi", "Faida/Hasara", "Maombi", "Hali"]) + 1;
  const hali = (row: number, net: number) => ({
    formula: `IF(E${row}>0,"Faida",IF(E${row}<0,"Hasara","Sawa"))`,
    result: net > 0 ? "Faida" : net < 0 ? "Hasara" : "Sawa",
  });
  data.byCar.forEach((c, i) => {
    const row = byCarStart + i;
    s.getRow(row).values = [
      c.label,
      c.car ?? "",
      { formula: `SUMIFS(${incomeAmounts},${range(income, income.carCol)},A${row})`, result: c.income },
      { formula: `SUMIFS(${spendAmounts},${range(spend, spend.carCol)},A${row})`, result: c.spend },
      { formula: `C${row}-D${row}`, result: c.income - c.spend },
      { formula: `COUNTIFS(${range(spend, spend.carCol)},A${row},${spendAmounts},">0")`, result: c.count },
      hali(row, c.income - c.spend),
    ];
  });
  const byCarEnd = byCarStart + Math.max(data.byCar.length, 1) - 1;
  totalRow(s, byCarEnd + 1, byCarStart, byCarEnd, ["C", "D", "E", "F"]);
  s.getCell(`G${byCarEnd + 1}`).value = hali(byCarEnd + 1, data.totals.balance);
  moneyCols(s, byCarStart, byCarEnd + 1, ["C", "D", "E"]);
  profitColors(s, byCarStart, byCarEnd + 1);
  dataBar(s, `D${byCarStart}:D${byCarEnd}`, "FFF2C27A");

  // Per month (or week): income, spending and balance.
  r = byCarEnd + 3;
  const pStart = sectionHeader(s, r, `Kwa ${data.periodName.toLowerCase()}`, [data.periodName, "Mapato", "Matumizi", "Salio"]) + 1;
  data.periods.forEach((p, i) => {
    const row = pStart + i;
    s.getRow(row).values = [
      p.label,
      { formula: `SUMIFS(${incomeAmounts},${range(income, income.periodCol)},A${row})`, result: p.income },
      { formula: `SUMIFS(${spendAmounts},${range(spend, spend.periodCol)},A${row})`, result: p.spend },
      { formula: `B${row}-C${row}`, result: p.income - p.spend },
    ];
  });
  const pEnd = pStart + Math.max(data.periods.length, 1) - 1;
  totalRow(s, pEnd + 1, pStart, pEnd, ["B", "C", "D"]);
  moneyCols(s, pStart, pEnd + 1, ["B", "C", "D"]);
  negativeRed(s, `D${pStart}:D${pEnd + 1}`);

  // Spending by kind, with each kind's share.
  r = pEnd + 3;
  const kStart = sectionHeader(s, r, "Matumizi kwa aina", ["Aina", "Kiasi", "Sehemu"]) + 1;
  const kindTotal = data.totals.spend;
  data.byKind.forEach((k, i) => {
    const row = kStart + i;
    s.getRow(row).values = [
      k.label,
      { formula: `SUMIFS(${spendAmounts},${range(spend, spend.kindCol!)},A${row})`, result: k.total },
      { formula: `IFERROR(B${row}/B${kStart + data.byKind.length},0)`, result: kindTotal ? k.total / kindTotal : 0 },
    ];
  });
  const kEnd = kStart + data.byKind.length - 1;
  totalRow(s, kEnd + 1, kStart, kEnd, ["B", "C"]);
  moneyCols(s, kStart, kEnd + 1, ["B"]);
  for (let row = kStart; row <= kEnd + 1; row++) s.getCell(`C${row}`).numFmt = "0%";

  // A short fuel line, pointing at the Mafuta sheet.
  r = kEnd + 3;
  const f = data.fuel.all;
  sectionHeader(s, r, "Mafuta", ["Km", "Lita", "Km kwa lita", "TSh kwa km"]);
  s.getRow(r + 2).values = [
    f.km,
    Number(f.litres.toFixed(1)),
    { formula: `IFERROR(A${r + 2}/B${r + 2},"")`, result: f.kmPerLitre ?? "" },
    f.costPerKm === null ? "" : Math.round(f.costPerKm),
  ];
  s.getCell(`A${r + 2}`).numFmt = NUMBER;
  s.getCell(`B${r + 2}`).numFmt = DECIMAL;
  s.getCell(`C${r + 2}`).numFmt = DECIMAL;
  s.getCell(`D${r + 2}`).numFmt = MONEY;
  s.getCell(`A${r + 3}`).value = "Maelezo kamili yako kwenye karatasi ya Mafuta.";
  s.getCell(`A${r + 3}`).font = { italic: true, size: 9, color: { argb: COLOR.muted } };

  s.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };

  // Charts sit to the right of the tables, two across: money over time and by kind, income and
  // spending by car, then each car's income against its spending and its faida.
  const sheet = "Muhtasari";
  const ref = (c: string, a: number, b: number) => `${quote(sheet)}!$${c}$${a}:$${c}$${b}`;
  const charts: ChartSpec[] = [];
  if (data.periods.length) {
    charts.push({
      sheet,
      type: "column",
      title: `Mapato na matumizi kwa ${data.periodName.toLowerCase()}`,
      from: [8, 5],
      to: [16, 22],
      numberFormat: '#,##0',
      series: [
        { name: "Mapato", color: "1F7A45", categoriesRef: ref("A", pStart, pEnd), valuesRef: ref("B", pStart, pEnd), categories: data.periods.map((p) => p.label), values: data.periods.map((p) => p.income) },
        { name: "Matumizi", color: "D08A1A", categoriesRef: ref("A", pStart, pEnd), valuesRef: ref("C", pStart, pEnd), categories: data.periods.map((p) => p.label), values: data.periods.map((p) => p.spend) },
      ],
    });
  }
  charts.push({
    sheet,
    type: "doughnut",
    title: "Matumizi kwa aina",
    from: [16, 5],
    to: [23, 22],
    pointColors: ["D08A1A", "2357B5"],
    series: [{ name: "Matumizi", categoriesRef: ref("A", kStart, kEnd), valuesRef: ref("B", kStart, kEnd), categories: data.byKind.map((k) => k.label), values: data.byKind.map((k) => k.total) }],
  });
  if (data.byCar.length) {
    const cars = data.byCar.map((c) => c.label);
    charts.push({
      sheet,
      type: "pie",
      title: "Mapato kwa gari",
      from: [8, 23],
      to: [16, 41],
      pointColors: PALETTE,
      series: [{ name: "Mapato", categoriesRef: ref("A", byCarStart, byCarEnd), valuesRef: ref("C", byCarStart, byCarEnd), categories: cars, values: data.byCar.map((c) => c.income) }],
    });
    charts.push({
      sheet,
      type: "pie",
      title: "Matumizi kwa gari",
      from: [16, 23],
      to: [23, 41],
      pointColors: PALETTE,
      series: [{ name: "Matumizi", categoriesRef: ref("A", byCarStart, byCarEnd), valuesRef: ref("D", byCarStart, byCarEnd), categories: cars, values: data.byCar.map((c) => c.spend) }],
    });
    charts.push({
      sheet,
      type: "bar",
      title: "Mapato na matumizi kwa gari",
      from: [8, 42],
      to: [16, 60],
      series: [
        { name: "Mapato", color: "1F7A45", categoriesRef: ref("A", byCarStart, byCarEnd), valuesRef: ref("C", byCarStart, byCarEnd), categories: data.byCar.map((c) => c.label), values: data.byCar.map((c) => c.income) },
        { name: "Matumizi", color: "D08A1A", categoriesRef: ref("A", byCarStart, byCarEnd), valuesRef: ref("D", byCarStart, byCarEnd), categories: data.byCar.map((c) => c.label), values: data.byCar.map((c) => c.spend) },
      ],
    });
    // Green for faida, red for hasara, as the figures were when the file was made.
    charts.push({
      sheet,
      type: "bar",
      title: "Faida kwa gari",
      from: [16, 42],
      to: [23, 60],
      pointColors: data.byCar.map((c) => (c.income - c.spend < 0 ? "C22F2F" : "1F7A45")),
      series: [{ name: "Faida/Hasara", categoriesRef: ref("A", byCarStart, byCarEnd), valuesRef: ref("E", byCarStart, byCarEnd), categories: cars, values: data.byCar.map((c) => c.income - c.spend) }],
    });
  }
  return charts;
}

// Fuel by car and by driver.
function addFuelSheets(wb: ExcelJS.Workbook, data: ReportData): ChartSpec[] {
  const fuel = data.fuel;
  const s = wb.addWorksheet("Mafuta", { properties: { tabColor: { argb: COLOR.balance } }, views: [{ showGridLines: false }] });
  [12, 20, 20, 12, 12, 13, 16, 13, 3].forEach((w, i) => (s.getColumn(i + 1).width = w));
  s.getCell("A1").value = "Matumizi ya mafuta";
  s.getCell("A1").font = { bold: true, size: 14, color: { argb: COLOR.accent } };
  s.getCell("A2").value = `${data.rangeLabel}. Km na lita ni kati ya vipimo vya kilomita na geji. Km kwa lita na TSh kwa km ni fomula.`;
  s.getCell("A2").font = { color: { argb: COLOR.muted } };

  const head = ["Namba", "Gari", "Dereva", "Km", "Lita", "Km kwa lita", "Gharama", "TSh kwa km"];
  const carStart = sectionHeader(s, 4, "Kwa gari", head) + 1;
  fuel.cars.forEach((c, i) => {
    const row = carStart + i;
    s.getRow(row).values = [
      c.plate,
      c.car ?? "",
      c.driver ?? "Hana dereva",
      c.totals.km,
      Number(c.totals.litres.toFixed(1)),
      { formula: `IFERROR(D${row}/E${row},"")`, result: c.totals.kmPerLitre ?? "" },
      Math.round(c.totals.cost),
      { formula: `IFERROR(G${row}/D${row},"")`, result: c.totals.costPerKm ?? "" },
    ];
  });
  const carEnd = carStart + Math.max(fuel.cars.length, 1) - 1;
  totalRow(s, carEnd + 1, carStart, carEnd, ["D", "E", "G"]);
  s.getCell(`F${carEnd + 1}`).value = { formula: `IFERROR(D${carEnd + 1}/E${carEnd + 1},"")`, result: fuel.all.kmPerLitre ?? "" };
  s.getCell(`H${carEnd + 1}`).value = { formula: `IFERROR(G${carEnd + 1}/D${carEnd + 1},"")`, result: fuel.all.costPerKm ?? "" };
  fuelFormats(s, carStart, carEnd + 1);
  colorScale(s, `F${carStart}:F${carEnd}`);

  const dStart = sectionHeader(s, carEnd + 3, "Kwa dereva", ["Dereva", "", "", "Km", "Lita", "Km kwa lita", "Gharama", "TSh kwa km"]) + 1;
  fuel.drivers.forEach((d, i) => {
    const row = dStart + i;
    s.getRow(row).values = [
      d.name,
      "",
      "",
      d.totals.km,
      Number(d.totals.litres.toFixed(1)),
      { formula: `IFERROR(D${row}/E${row},"")`, result: d.totals.kmPerLitre ?? "" },
      Math.round(d.totals.cost),
      { formula: `IFERROR(G${row}/D${row},"")`, result: d.totals.costPerKm ?? "" },
    ];
    s.mergeCells(`A${row}:C${row}`);
  });
  const dEnd = dStart + Math.max(fuel.drivers.length, 1) - 1;
  fuelFormats(s, dStart, dEnd);
  colorScale(s, `F${dStart}:F${dEnd}`);
  s.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };

  if (!fuel.cars.length) return [];
  const sheet = "Mafuta";
  const ref = (c: string, a: number, b: number) => `${quote(sheet)}!$${c}$${a}:$${c}$${b}`;
  const charts: ChartSpec[] = [
    {
      sheet,
      type: "bar",
      title: "Km kwa lita, kila gari",
      from: [10, 3],
      to: [18, 18],
      numberFormat: "0.0",
      series: [{ name: "Km kwa lita", color: "2357B5", categoriesRef: ref("A", carStart, carEnd), valuesRef: ref("F", carStart, carEnd), categories: fuel.cars.map((c) => c.plate), values: fuel.cars.map((c) => Number((c.totals.kmPerLitre ?? 0).toFixed(1))) }],
    },
  ];
  if (fuel.drivers.length) {
    charts.push({
      sheet,
      type: "pie",
      title: "Lita zilizotumika kwa dereva",
      from: [10, 19],
      to: [18, 35],
      pointColors: PALETTE,
      numberFormat: "0.0",
      series: [{ name: "Lita", categoriesRef: ref("A", dStart, dEnd), valuesRef: ref("E", dStart, dEnd), categories: fuel.drivers.map((d) => d.name), values: fuel.drivers.map((d) => Number(d.totals.litres.toFixed(1))) }],
    });
  }
  return charts;
}

// A bold title row, then a header row; returns the header's row number.
function sectionHeader(s: ExcelJS.Worksheet, r: number, title: string, headers: string[]) {
  s.getCell(`A${r}`).value = title;
  s.getCell(`A${r}`).font = { bold: true, size: 12, color: { argb: COLOR.ink } };
  const h = s.getRow(r + 1);
  h.values = headers;
  headers.forEach((_, i) => {
    const c = h.getCell(i + 1);
    c.font = { bold: true, color: { argb: COLOR.accent } };
    c.fill = fill(COLOR.accentSoft);
    c.border = { bottom: { style: "thin", color: { argb: COLOR.accent } } };
  });
  return r + 1;
}

function totalRow(s: ExcelJS.Worksheet, row: number, from: number, to: number, cols: string[]) {
  s.getCell(`A${row}`).value = "Jumla";
  for (const c of cols) {
    let result = 0;
    for (let r = from; r <= to; r++) {
      const v = s.getCell(`${c}${r}`).value as number | { result?: number } | null;
      result += typeof v === "number" ? v : Number((v as { result?: number })?.result ?? 0) || 0;
    }
    s.getCell(`${c}${row}`).value = { formula: `SUM(${c}${from}:${c}${to})`, result };
  }
  s.getRow(row).eachCell((cell) => {
    cell.font = { bold: true };
    cell.border = { top: { style: "thin", color: { argb: COLOR.ink } } };
  });
}

function moneyCols(s: ExcelJS.Worksheet, from: number, to: number, cols: string[]) {
  for (const c of cols) for (let r = from; r <= to; r++) s.getCell(`${c}${r}`).numFmt = MONEY;
}

function fuelFormats(s: ExcelJS.Worksheet, from: number, to: number) {
  for (let r = from; r <= to; r++) {
    s.getCell(`D${r}`).numFmt = NUMBER;
    s.getCell(`E${r}`).numFmt = DECIMAL;
    s.getCell(`F${r}`).numFmt = DECIMAL;
    s.getCell(`G${r}`).numFmt = MONEY;
    s.getCell(`H${r}`).numFmt = MONEY;
  }
}

function negativeRed(s: ExcelJS.Worksheet, ref: string) {
  s.addConditionalFormatting({
    ref,
    rules: [{ type: "cellIs", operator: "lessThan", priority: 1, formulae: ["0"], style: { font: { color: { argb: COLOR.danger }, bold: true } } } as ExcelJS.CellIsRuleType],
  });
}

// Faida/Hasara (column E) and Hali (column G): green with a soft fill above zero, red below.
function profitColors(s: ExcelJS.Worksheet, from: number, to: number) {
  for (const col of ["E", "G"]) {
    s.addConditionalFormatting({
      ref: `${col}${from}:${col}${to}`,
      rules: [
        {
          type: "expression",
          priority: 1,
          formulae: [`$E${from}>0`],
          style: { font: { color: { argb: COLOR.in }, bold: true }, fill: { type: "pattern", pattern: "solid", bgColor: { argb: COLOR.inSoft } } },
        },
        {
          type: "expression",
          priority: 2,
          formulae: [`$E${from}<0`],
          style: { font: { color: { argb: COLOR.danger }, bold: true }, fill: { type: "pattern", pattern: "solid", bgColor: { argb: COLOR.dangerSoft } } },
        },
      ],
    });
  }
}

function dataBar(s: ExcelJS.Worksheet, ref: string, argb: string) {
  s.addConditionalFormatting({
    ref,
    rules: [{ type: "dataBar", priority: 2, minLength: 0, maxLength: 100, cfvo: [{ type: "min" }, { type: "max" }], color: { argb } } as ExcelJS.DataBarRuleType],
  });
}

// Low km per litre red, high green.
function colorScale(s: ExcelJS.Worksheet, ref: string) {
  s.addConditionalFormatting({
    ref,
    rules: [
      {
        type: "colorScale",
        priority: 3,
        cfvo: [{ type: "min" }, { type: "percentile", value: 50 }, { type: "max" }],
        color: [{ argb: "FFF4B4B4" }, { argb: "FFFCF0D9" }, { argb: "FFBFE5CB" }],
      } as ExcelJS.ColorScaleRuleType,
    ],
  });
}

function setupPrint(s: ExcelJS.Worksheet) {
  s.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, printTitlesRow: "1:1" };
}
