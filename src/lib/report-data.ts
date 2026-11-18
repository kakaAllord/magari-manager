import { sw, type Tr } from "@/lib/i18n";
import { getT } from "@/lib/lang";
import "server-only";
import { dayRange, getFuelOverview, type FuelOverview } from "@/lib/fuel";
import { formatDateTime } from "@/lib/format";
import { formatDay, parseReportParams, periodLabel, periodStarts, type ReportParams } from "@/lib/report-params";
import {
  getExpenses,
  getIncomes,
  listCars,
  moneyByCar,
  summarise,
  summariseIncome,
  todayInTanzania,
  WITHOUT_CAR,
  type CarMoneyRow,
  type CarOption,
  type ExpenseRow,
  type IncomeRow,
  type IncomeSummary,
  type Summary,
} from "@/lib/reports";

export const NO_CAR = WITHOUT_CAR;

// Everything a downloaded report (Excel or PDF) shows, worked out once.
export type ReportData = {
  // The reader's language: the PDF and the workbook are built in it.
  t: Tr;
  params: ReportParams;
  rangeLabel: string;
  carsLabel: string;
  groupLabel: string;
  createdLabel: string;
  cars: CarOption[];
  expenses: ExpenseRow[];
  incomes: IncomeRow[];
  summary: Summary;
  income: IncomeSummary;
  totals: { income: number; spend: number; balance: number };
  // Per car (and "Bila gari" when something had no car): income, spending and how many requests.
  byCar: CarMoneyRow[];
  byKind: { label: string; total: number }[];
  // Months, or weeks when the report is grouped by week.
  periodName: string;
  // `start` and `next` (the following period's first day) are "YYYY-MM-DD"; the last has no `next`.
  periods: { label: string; start: string; next: string | null; income: number; spend: number }[];
  fuel: FuelOverview;
};

const groupLabels = (t: Tr) => ({ car: t("kwa gari", "by car"), month: t("kwa mwezi", "by month"), week: t("kwa wiki", "by week") });

// The label a row goes under in the "per car" tables: the plate, or "Bila gari". It matches the
// label moneyByCar gives the no-car row, so the workbook's SUMIFS find it.
export const expenseCar = (e: ExpenseRow, t: Tr = sw) => e.plate ?? t(NO_CAR, "No car");
export const incomeCar = (i: IncomeRow, t: Tr = sw) => (i.car_id !== null ? i.source : t(NO_CAR, "No car"));
// The month or week a row falls in, as the per-period tables label it.
export const periodOfRow = (row: { month_start: string; week_start: string }, group: "month" | "week", t: Tr = sw) =>
  periodLabel(group === "month" ? row.month_start : row.week_start, group, t);
export const kindLabel = (kind: string, t: Tr) => (kind === "fuel" ? t("Mafuta", "Fuel") : t("Mengineyo", "Other"));

export async function getReportData(searchParams: Record<string, string | string[] | undefined>): Promise<ReportData> {
  const params = parseReportParams(searchParams, todayInTanzania());
  const [t, cars, expenses, incomes, fuel] = await Promise.all([
    getT(),
    listCars(),
    getExpenses(params),
    getIncomes(params),
    getFuelOverview(dayRange(params.from, params.to), params.carIds),
  ]);
  const chosen = params.carIds.length ? cars.filter((c) => params.carIds.includes(c.id)) : cars;
  const sum = (xs: { amount: string }[]) => xs.reduce((s, x) => s + Number(x.amount), 0);

  const byCar = moneyByCar(chosen, expenses, incomes, t);

  const periodGroup = params.group === "week" ? "week" : "month";
  const starts = periodStarts(params.from, params.to, periodGroup);
  const periods = starts.map((start, i) => {
    const label = periodLabel(start, periodGroup, t);
    return {
      label,
      start,
      next: starts[i + 1] ?? null,
      income: sum(incomes.filter((i) => periodOfRow(i, periodGroup, t) === label)),
      spend: sum(expenses.filter((e) => periodOfRow(e, periodGroup, t) === label)),
    };
  });

  const totalIncome = sum(incomes);
  const totalSpend = sum(expenses);
  return {
    t,
    params,
    rangeLabel: `${formatDay(params.from)} ${t("hadi", "to")} ${formatDay(params.to)}`,
    carsLabel: params.carIds.length ? chosen.map((c) => c.plate).join(", ") : t(`Magari yote (${cars.length})`, `All cars (${cars.length})`),
    groupLabel: groupLabels(t)[params.group],
    createdLabel: formatDateTime(new Date()),
    cars: chosen,
    expenses,
    incomes,
    summary: summarise(expenses, cars, params, t),
    income: summariseIncome(incomes, params, t),
    totals: { income: totalIncome, spend: totalSpend, balance: totalIncome - totalSpend },
    byCar,
    byKind: [
      { label: kindLabel("fuel", t), total: sum(expenses.filter((e) => e.kind === "fuel")) },
      { label: kindLabel("other", t), total: sum(expenses.filter((e) => e.kind !== "fuel")) },
    ],
    periodName: periodGroup === "month" ? t("Mwezi", "Month") : t("Wiki", "Week"),
    periods,
    fuel,
  };
}
