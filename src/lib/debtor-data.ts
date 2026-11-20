import "server-only";
import {
  AGE_BANDS,
  clientOptions,
  clientKey,
  fileSlug,
  groupDebtors,
  owedByAge,
  parseDebtFilters,
  type ClientJob,
  type DebtFilters,
  type Debtor,
} from "@/lib/debtor-report";
import { formatDateTime } from "@/lib/format";
import type { Tr } from "@/lib/i18n";
import { listClientJobs, listClientNames } from "@/lib/incomes";
import { getT } from "@/lib/lang";
import { formatDay, parseReportParams, type ReportParams } from "@/lib/report-params";
import { listCars, todayInTanzania } from "@/lib/reports";

// Everything the Madeni tab and the debtors PDF show, worked out once. The car filter always applies;
// the report's dates only with scope "period" (`madeni=kipindi`); `mteja` keeps one client and
// `hali=zote` adds the jobs already paid in full, so a client's whole account shows.
export type DebtorReport = {
  t: Tr;
  params: ReportParams;
  filters: DebtFilters;
  today: string;
  scopeLabel: string;
  carsLabel: string;
  // The picked client's name, or null for every client.
  clientName: string | null;
  createdLabel: string;
  clients: { key: string; name: string }[];
  jobs: ClientJob[];
  debtors: Debtor[];
  // Value of the jobs, what has come in and what is still owed.
  amount: number;
  paid: number;
  total: number;
  // What is owed in each of AGE_BANDS, and how much is over 60 days old.
  bands: { label: string; owed: number }[];
  over60: number;
};

export async function getDebtorReport(searchParams: Record<string, string | string[] | undefined>): Promise<DebtorReport> {
  const today = todayInTanzania();
  const params = parseReportParams(searchParams, today);
  const filters = parseDebtFilters(searchParams);
  const [t, cars, allJobs, names] = await Promise.all([
    getT(),
    listCars(),
    listClientJobs({
      carIds: params.carIds,
      range: filters.scope === "period" ? { from: params.from, to: params.to } : undefined,
      withPaid: filters.withPaid,
    }),
    listClientNames(),
  ]);
  const clients = clientOptions(names);
  const jobs = filters.client ? allJobs.filter((j) => clientKey(j.customer) === filters.client) : allJobs;
  const owed = owedByAge(jobs);
  const chosen = cars.filter((c) => params.carIds.includes(c.id));
  const which = filters.withPaid ? t("pamoja na zilizolipwa", "paid ones included") : null;
  return {
    t,
    params,
    filters,
    today,
    scopeLabel:
      (filters.scope === "all"
        ? filters.withPaid
          ? t(`Kazi zote hadi ${formatDay(today)}`, `Every job up to ${formatDay(today)}`)
          : t(`Madeni yote hadi ${formatDay(today)}`, `Everything owed as of ${formatDay(today)}`)
        : filters.withPaid
          ? t(`Kazi za ${formatDay(params.from)} hadi ${formatDay(params.to)}`, `Jobs from ${formatDay(params.from)} to ${formatDay(params.to)}`)
          : t(
              `Kazi za ${formatDay(params.from)} hadi ${formatDay(params.to)} ambazo bado hazijalipwa`,
              `Jobs from ${formatDay(params.from)} to ${formatDay(params.to)} still unpaid`,
            )) + (which ? `, ${which}` : ""),
    carsLabel: chosen.length ? chosen.map((c) => c.plate).join(", ") : t("Magari yote", "All cars"),
    clientName: filters.client ? (clients.find((c) => c.key === filters.client)?.name ?? filters.client) : null,
    createdLabel: formatDateTime(new Date()),
    clients,
    jobs,
    debtors: groupDebtors(jobs, t),
    amount: jobs.reduce((a, j) => a + j.amount, 0),
    paid: jobs.reduce((a, j) => a + j.paid, 0),
    total: owed.reduce((a, b) => a + b, 0),
    bands: AGE_BANDS.map((b, i) => ({ label: t(`Siku ${b.label}`, `${b.label} days`), owed: owed[i] })),
    over60: owed[2] + owed[3],
  };
}

export function debtorsFilename(r: DebtorReport) {
  const { t, filters, params, today } = r;
  const base = filters.withPaid ? t("zuraja_hesabu_ya_wateja", "zuraja_client_accounts") : t("zuraja_madeni", "zuraja_debtors");
  const client = r.clientName ? `_${fileSlug(r.clientName)}` : "";
  const dates = filters.scope === "all" ? t(`_hadi_${today}`, `_as_of_${today}`) : t(`_${params.from}_hadi_${params.to}`, `_${params.from}_to_${params.to}`);
  return `${base}${client}${dates}.pdf`;
}
