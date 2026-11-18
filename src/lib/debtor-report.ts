// Pure helpers for the debtors report (Ripoti → Madeni and its PDF), kept free of server imports
// for node --test. The rows come from listUnpaidJobs in incomes.ts.
import { sw, type Tr } from "./i18n.ts";

// One job a client hasn't finished paying for. `at` is its date in Tanzania ("YYYY-MM-DD") and `days`
// how long ago that was.
export type UnpaidJob = {
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

export type Debtor = { customer: string; jobs: UnpaidJob[]; amount: number; paid: number; owed: number; days: number };

// Which jobs the report covers: everything still owed today, or only jobs dated in the report's period
// (still unpaid today). Lives in the URL as `madeni=kipindi`.
export type DebtScope = "all" | "period";
export const parseDebtScope = (v: string | string[] | undefined): DebtScope => (v === "kipindi" ? "period" : "all");
export const debtScopeParam = (scope: DebtScope) => (scope === "period" ? "&madeni=kipindi" : "");

export const owedOn = (j: UnpaidJob) => j.amount - j.paid;

// The usual ageing bands for money owed, by days since the job.
export const AGE_BANDS = [
  { max: 30, label: "0–30" },
  { max: 60, label: "31–60" },
  { max: 90, label: "61–90" },
  { max: Infinity, label: "90+" },
] as const;

export const ageBand = (days: number) => AGE_BANDS.findIndex((b) => days <= b.max);

// What is owed in each band, in AGE_BANDS order.
export function owedByAge(jobs: UnpaidJob[]): number[] {
  const out = AGE_BANDS.map(() => 0);
  for (const j of jobs) out[ageBand(j.days)] += owedOn(j);
  return out;
}

// One entry per client, names matched ignoring case and spaces (as listDebtors does), largest debt
// first and the longest-standing first among equals. Each client's jobs stay oldest first.
export function groupDebtors(jobs: UnpaidJob[], t: Tr = sw): Debtor[] {
  const byName = new Map<string, Debtor>();
  for (const j of jobs) {
    const name = j.customer?.trim() || t("Bila jina", "No name");
    const key = name.toLowerCase().replace(/\s+/g, " ");
    const d = byName.get(key) ?? { customer: name, jobs: [], amount: 0, paid: 0, owed: 0, days: 0 };
    d.jobs.push(j);
    d.amount += j.amount;
    d.paid += j.paid;
    d.owed += owedOn(j);
    d.days = Math.max(d.days, j.days);
    byName.set(key, d);
  }
  for (const d of byName.values()) d.jobs.sort((a, b) => a.at.localeCompare(b.at) || a.id - b.id);
  return [...byName.values()].sort((a, b) => b.owed - a.owed || b.days - a.days);
}
