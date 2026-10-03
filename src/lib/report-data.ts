import "server-only";
import { dayRange, getFuelOverview, type FuelOverview } from "@/lib/fuel";
import { formatDay, parseReportParams, periodLabel, periodStarts, type ReportParams } from "@/lib/report-params";
import {
  getExpenses,
  getIncomes,
  listCars,
  summarise,
  summariseIncome,
  todayInTanzania,
  type CarOption,
  type ExpenseRow,
  type IncomeRow,
  type IncomeSummary,
  type Summary,
} from "@/lib/reports";
import { TIME_ZONE } from "@/lib/time";

export const NO_CAR = "Bila gari";

// Everything a downloaded report (Excel or PDF) shows, worked out once.
export type ReportData = {
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
  byCar: { label: string; car: string | null; income: number; spend: number; count: number }[];
  byKind: { label: string; total: number }[];
  // Months, or weeks when the report is grouped by week.
  periodName: "Mwezi" | "Wiki";
  periods: { label: string; income: number; spend: number }[];
  fuel: FuelOverview;
};

const groupLabels = { car: "kwa gari", month: "kwa mwezi", week: "kwa wiki" } as const;
const created = new Intl.DateTimeFormat("sw-TZ", { dateStyle: "long", timeStyle: "short", timeZone: TIME_ZONE });

// The label a row goes under in the "per car" tables: the plate, or "Bila gari".
export const expenseCar = (e: ExpenseRow) => e.plate ?? NO_CAR;
export const incomeCar = (i: IncomeRow) => (i.car_id !== null ? i.source : NO_CAR);
// The month or week a row falls in, as the per-period tables label it.
export const periodOfRow = (row: { month_start: string; week_start: string }, group: "month" | "week") =>
  periodLabel(group === "month" ? row.month_start : row.week_start, group);

export async function getReportData(searchParams: Record<string, string | string[] | undefined>): Promise<ReportData> {
  const params = parseReportParams(searchParams, todayInTanzania());
  const [cars, expenses, incomes, fuel] = await Promise.all([
    listCars(),
    getExpenses(params),
    getIncomes(params),
    getFuelOverview(dayRange(params.from, params.to), params.carIds),
  ]);
  const chosen = params.carIds.length ? cars.filter((c) => params.carIds.includes(c.id)) : cars;
  const sum = (xs: { amount: string }[]) => xs.reduce((s, x) => s + Number(x.amount), 0);

  const byCar = chosen.map((c) => {
    const spent = expenses.filter((e) => e.car_id === c.id);
    return {
      label: c.plate,
      car: c.car,
      income: sum(incomes.filter((i) => incomeCar(i) === c.plate)),
      spend: sum(spent),
      count: spent.length,
    };
  });
  const noCarSpend = expenses.filter((e) => e.car_id === null);
  const noCarIncome = incomes.filter((i) => incomeCar(i) === NO_CAR);
  if (noCarSpend.length || noCarIncome.length) {
    byCar.push({ label: NO_CAR, car: "Ofisi na mengineyo", income: sum(noCarIncome), spend: sum(noCarSpend), count: noCarSpend.length });
  }

  const periodGroup = params.group === "week" ? "week" : "month";
  const periods = periodStarts(params.from, params.to, periodGroup).map((start) => {
    const label = periodLabel(start, periodGroup);
    return {
      label,
      income: sum(incomes.filter((i) => periodOfRow(i, periodGroup) === label)),
      spend: sum(expenses.filter((e) => periodOfRow(e, periodGroup) === label)),
    };
  });

  const totalIncome = sum(incomes);
  const totalSpend = sum(expenses);
  return {
    params,
    rangeLabel: `${formatDay(params.from)} hadi ${formatDay(params.to)}`,
    carsLabel: params.carIds.length ? chosen.map((c) => c.plate).join(", ") : `Magari yote (${cars.length})`,
    groupLabel: groupLabels[params.group],
    createdLabel: created.format(new Date()),
    cars: chosen,
    expenses,
    incomes,
    summary: summarise(expenses, cars, params),
    income: summariseIncome(incomes, params),
    totals: { income: totalIncome, spend: totalSpend, balance: totalIncome - totalSpend },
    byCar,
    byKind: [
      { label: "Mafuta", total: sum(expenses.filter((e) => e.kind === "fuel")) },
      { label: "Mengineyo", total: sum(expenses.filter((e) => e.kind !== "fuel")) },
    ],
    periodName: periodGroup === "month" ? "Mwezi" : "Wiki",
    periods,
    fuel,
  };
}
