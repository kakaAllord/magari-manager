// Pure helpers for the reports filter, kept free of server imports for node --test.

export type Grouping = "car" | "month" | "week";
export type ReportParams = { carIds: number[]; from: string; to: string; group: Grouping };
type SearchParams = Record<string, string | string[] | undefined>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 86_400_000;

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (d: Date) => d.toISOString().slice(0, 10);
const isValidDate = (s: string | undefined): s is string => !!s && ISO_DATE.test(s) && toIso(toDate(s)) === s;
const list = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

// Empty carIds means all cars. Defaults to this month so far, grouped by car.
export function parseReportParams(sp: SearchParams, today: string): ReportParams {
  const carIds = [...new Set(list(sp.cars).map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  const group = sp.group === "month" || sp.group === "week" ? sp.group : "car";
  let from = isValidDate(sp.from as string) ? (sp.from as string) : `${today.slice(0, 8)}01`;
  let to = isValidDate(sp.to as string) ? (sp.to as string) : today;
  if (from > to) [from, to] = [to, from];
  return { carIds, from, to, group };
}

export function toSearch(p: ReportParams) {
  const q = new URLSearchParams({ from: p.from, to: p.to, group: p.group });
  for (const id of p.carIds) q.append("cars", String(id));
  return q.toString();
}

// Period starts (YYYY-MM-DD) covering [from, to]: first of each month, or Monday of each week.
export function periodStarts(from: string, to: string, group: "month" | "week"): string[] {
  const out: string[] = [];
  const end = toDate(to);
  let d = toDate(from);
  if (group === "month") {
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    while (d <= end) {
      out.push(toIso(d));
      d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
    }
  } else {
    d = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY);
    while (d <= end) {
      out.push(toIso(d));
      d = new Date(d.getTime() + 7 * DAY);
    }
  }
  return out;
}

const monthName = new Intl.DateTimeFormat("en-GB", { month: "2-digit", year: "numeric", timeZone: "UTC" });
const dayName = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

export const periodLabel = (start: string, group: "month" | "week") =>
  group === "month" ? monthName.format(toDate(start)) : `Wiki ya ${dayName.format(toDate(start))}`;

export const formatDay = (iso: string) => dayName.format(toDate(iso));

// Quick ranges for the filter, relative to today's date in Tanzania.
export function presets(today: string) {
  const t = toDate(today);
  const y = t.getUTCFullYear();
  const m = t.getUTCMonth();
  const iso = (yy: number, mm: number, dd: number) => toIso(new Date(Date.UTC(yy, mm, dd)));
  return [
    { label: "Mwezi huu", from: iso(y, m, 1), to: today },
    { label: "Mwezi uliopita", from: iso(y, m - 1, 1), to: iso(y, m, 0) },
    { label: "Miezi 3", from: iso(y, m - 2, 1), to: today },
    { label: "Mwaka huu", from: iso(y, 0, 1), to: today },
  ];
}
