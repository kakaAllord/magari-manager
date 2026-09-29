import "server-only";
import { query } from "@/lib/db";
import { periodLabel, periodStarts, type ReportParams } from "@/lib/report-params";
import { TIME_ZONE } from "@/lib/time";

export type ExpenseRow = {
  approved_at: string; // local "YYYY-MM-DD HH24:MI"
  requested_at: string;
  month_start: string;
  week_start: string;
  car_id: number | null;
  plate: string | null;
  car: string | null;
  driver: string;
  reason: string;
  amount: string;
  approved_by: string | null;
};

export type CarOption = { id: number; plate: string; car: string };

export const listCars = () =>
  query<CarOption>("SELECT id, plate, make || ' ' || model AS car FROM cars ORDER BY plate");

export const todayInTanzania = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());

// Approved requests whose approval date (Tanzanian time) falls within [from, to].
export function getExpenses(p: ReportParams) {
  return query<ExpenseRow>(
    `SELECT to_char(r.reviewed_at AT TIME ZONE $1, 'YYYY-MM-DD HH24:MI') AS approved_at,
            to_char(r.created_at AT TIME ZONE $1, 'YYYY-MM-DD HH24:MI') AS requested_at,
            to_char(date_trunc('month', r.reviewed_at AT TIME ZONE $1), 'YYYY-MM-DD') AS month_start,
            to_char(date_trunc('week', r.reviewed_at AT TIME ZONE $1), 'YYYY-MM-DD') AS week_start,
            c.id AS car_id, c.plate, c.make || ' ' || c.model AS car,
            d.name AS driver, r.reason, r.amount, m.name AS approved_by
       FROM money_requests r
       JOIN users d ON d.id = r.driver_id
       LEFT JOIN users m ON m.id = r.reviewed_by
       LEFT JOIN cars c ON c.id = r.car_id
      WHERE r.status = 'approved'
        AND (r.reviewed_at AT TIME ZONE $1)::date BETWEEN $2::date AND $3::date
        AND (cardinality($4::int[]) = 0 OR r.car_id = ANY($4::int[]))
      ORDER BY r.reviewed_at`,
    [TIME_ZONE, p.from, p.to, p.carIds],
  );
}

export type Summary = {
  columns: { key: string; label: string; sub?: string }[];
  rows: { label: string; values: number[]; total: number; count: number }[];
  totals: number[];
  grandTotal: number;
  count: number;
};

const NO_CAR = "none";

// Per car: one row per car. Per month/week: one row per period, one column per car.
export function summarise(expenses: ExpenseRow[], cars: CarOption[], p: ReportParams): Summary {
  const chosen = p.carIds.length ? cars.filter((c) => p.carIds.includes(c.id)) : cars;
  const columns = chosen.map((c) => ({ key: String(c.id), label: c.plate, sub: c.car }));
  if (!p.carIds.length && expenses.some((e) => e.car_id === null)) {
    columns.push({ key: NO_CAR, label: "Hakuna gari", sub: "Dereva hakuwa na gari" });
  }
  const carKey = (e: ExpenseRow) => (e.car_id === null ? NO_CAR : String(e.car_id));
  const grandTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);

  if (p.group === "car") {
    const rows = columns.map((col) => {
      const mine = expenses.filter((e) => carKey(e) === col.key);
      const total = mine.reduce((s, e) => s + Number(e.amount), 0);
      return { label: col.label, values: [], total, count: mine.length, sub: col.sub };
    });
    return { columns: [], rows, totals: [], grandTotal, count: expenses.length };
  }

  const periodOf = (e: ExpenseRow) => (p.group === "month" ? e.month_start : e.week_start);
  const rows = periodStarts(p.from, p.to, p.group).map((start) => {
    const inPeriod = expenses.filter((e) => periodOf(e) === start);
    const values = columns.map((col) =>
      inPeriod.filter((e) => carKey(e) === col.key).reduce((s, e) => s + Number(e.amount), 0),
    );
    return {
      label: periodLabel(start, p.group as "month" | "week"),
      values,
      total: values.reduce((a, b) => a + b, 0),
      count: inPeriod.length,
    };
  });
  const totals = columns.map((_, i) => rows.reduce((s, r) => s + r.values[i], 0));
  return { columns, rows, totals, grandTotal, count: expenses.length };
}
