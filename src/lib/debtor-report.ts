// Pure helpers for the debtors report (Ripoti → Madeni and its PDF), kept free of server imports
// for node --test. The rows come from listClientJobs in incomes.ts.
import { sw, type Tr } from "./i18n.ts";

// One job done for a client: still owed on, or (with "pamoja na zilizolipwa") paid in full. `at` is
// its date in Tanzania ("YYYY-MM-DD") and `days` how long ago that was.
export type ClientJob = {
  id: number;
  at: string;
  customer: string | null;
  plate: string | null;
  car: string | null;
  invoice_number: string | null;
  description: string | null;
  rate_per_tonne: string | null;
  tonnes: string | null;
  unit: string;
  destination: string | null;
  amount: number;
  paid: number;
  days: number;
};

// `days` is how long since their oldest job still owed on, 0 when they have paid everything.
export type Debtor = { key: string; customer: string; jobs: ClientJob[]; amount: number; paid: number; owed: number; days: number };

// Which jobs the report covers: everything up to today, or only jobs dated in the report's period.
// Lives in the URL as `madeni=kipindi`.
export type DebtScope = "all" | "period";
export const parseDebtScope = (v: string | string[] | undefined): DebtScope => (v === "kipindi" ? "period" : "all");

// The Madeni filters, all in the URL so the tab, the PDF and the filter dialog agree:
// `madeni=kipindi` (scope), `mteja=<clientKey>` (one client) and `hali=zote` (paid jobs too, not only
// what is still owed).
export type DebtFilters = { scope: DebtScope; client: string | null; withPaid: boolean };
type SearchParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// How client names are matched: ignoring case and runs of spaces.
export const clientKey = (name: string | null | undefined) => (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export function parseDebtFilters(sp: SearchParams): DebtFilters {
  const client = clientKey(one(sp.mteja));
  return { scope: parseDebtScope(one(sp.madeni)), client: client || null, withPaid: one(sp.hali) === "zote" };
}

// The filters as URL pairs, only those that differ from the default (all up to today, every client,
// only what is still owed).
export function debtFilterEntries(f: DebtFilters): Record<string, string> {
  const out: Record<string, string> = {};
  if (f.scope === "period") out.madeni = "kipindi";
  if (f.client) out.mteja = f.client;
  if (f.withPaid) out.hali = "zote";
  return out;
}
export const debtFilterSearch = (f: DebtFilters) =>
  Object.entries(debtFilterEntries(f))
    .map(([k, v]) => `&${k}=${encodeURIComponent(v)}`)
    .join("");

// A client's name as a filename part: "Kagera Sugar Ltd." → "kagera_sugar_ltd".
export const fileSlug = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .slice(0, 40) || "mteja";

export const owedOn = (j: ClientJob) => j.amount - j.paid;

// The usual ageing bands for money owed, by days since the job.
export const AGE_BANDS = [
  { max: 30, label: "0–30" },
  { max: 60, label: "31–60" },
  { max: 90, label: "61–90" },
  { max: Infinity, label: "90+" },
] as const;

export const ageBand = (days: number) => AGE_BANDS.findIndex((b) => days <= b.max);

// What is owed in each band, in AGE_BANDS order. Jobs paid in full add nothing.
export function owedByAge(jobs: ClientJob[]): number[] {
  const out = AGE_BANDS.map(() => 0);
  for (const j of jobs) if (owedOn(j) > 0) out[ageBand(j.days)] += owedOn(j);
  return out;
}

// One entry per client, names matched by clientKey (as listDebtors does), largest debt first, the
// longest-standing first among equals, then the biggest client among those who have paid everything.
// Each client's jobs stay oldest first.
export function groupDebtors(jobs: ClientJob[], t: Tr = sw): Debtor[] {
  const byName = new Map<string, Debtor>();
  for (const j of jobs) {
    const name = j.customer?.trim().replace(/\s+/g, " ") || t("Bila jina", "No name");
    const key = clientKey(j.customer);
    const d = byName.get(key) ?? { key, customer: name, jobs: [], amount: 0, paid: 0, owed: 0, days: 0 };
    d.jobs.push(j);
    d.amount += j.amount;
    d.paid += j.paid;
    d.owed += owedOn(j);
    if (owedOn(j) > 0) d.days = Math.max(d.days, j.days);
    byName.set(key, d);
  }
  for (const d of byName.values()) d.jobs.sort((a, b) => a.at.localeCompare(b.at) || a.id - b.id);
  return [...byName.values()].sort((a, b) => b.owed - a.owed || b.days - a.days || b.amount - a.amount);
}

// Every client name once, by clientKey, for the client dropdown: the spelling used most recently
// (names arrive newest first), sorted by name.
export function clientOptions(names: string[]): { key: string; name: string }[] {
  const byKey = new Map<string, string>();
  for (const n of names) {
    const key = clientKey(n);
    if (key && !byKey.has(key)) byKey.set(key, n.trim().replace(/\s+/g, " "));
  }
  return [...byKey].map(([key, name]) => ({ key, name })).sort((a, b) => a.name.localeCompare(b.name));
}

// Old names, until the report uses the new ones.
export type UnpaidJob = ClientJob;
export const debtScopeParam = (scope: DebtScope) => (scope === "period" ? "&madeni=kipindi" : "");
