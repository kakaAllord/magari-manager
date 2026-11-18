import "server-only";
import { AGE_BANDS, groupDebtors, owedByAge, parseDebtScope, type DebtScope, type Debtor, type UnpaidJob } from "@/lib/debtor-report";
import { formatDateTime } from "@/lib/format";
import type { Tr } from "@/lib/i18n";
import { listUnpaidJobs } from "@/lib/incomes";
import { getT } from "@/lib/lang";
import { formatDay, parseReportParams, type ReportParams } from "@/lib/report-params";
import { listCars, todayInTanzania } from "@/lib/reports";

// Everything the Madeni tab and the debtors PDF show, worked out once. The car filter always applies;
// the report's dates only with `scope` "period" (`madeni=kipindi`).
export type DebtorReport = {
  t: Tr;
  params: ReportParams;
  scope: DebtScope;
  today: string;
  scopeLabel: string;
  carsLabel: string;
  createdLabel: string;
  jobs: UnpaidJob[];
  debtors: Debtor[];
  total: number;
  // What is owed in each of AGE_BANDS, and how much is over 60 days old.
  bands: { label: string; owed: number }[];
  over60: number;
};

export async function getDebtorReport(searchParams: Record<string, string | string[] | undefined>): Promise<DebtorReport> {
  const today = todayInTanzania();
  const params = parseReportParams(searchParams, today);
  const scope = parseDebtScope(searchParams.madeni);
  const [t, cars, jobs] = await Promise.all([
    getT(),
    listCars(),
    listUnpaidJobs({ carIds: params.carIds, range: scope === "period" ? { from: params.from, to: params.to } : undefined }),
  ]);
  const owed = owedByAge(jobs);
  const chosen = cars.filter((c) => params.carIds.includes(c.id));
  return {
    t,
    params,
    scope,
    today,
    scopeLabel:
      scope === "all"
        ? t(`Madeni yote hadi ${formatDay(today)}`, `Everything owed as of ${formatDay(today)}`)
        : t(
            `Kazi za ${formatDay(params.from)} hadi ${formatDay(params.to)} ambazo bado hazijalipwa`,
            `Jobs from ${formatDay(params.from)} to ${formatDay(params.to)} still unpaid`,
          ),
    carsLabel: chosen.length ? chosen.map((c) => c.plate).join(", ") : t("Magari yote", "All cars"),
    createdLabel: formatDateTime(new Date()),
    jobs,
    debtors: groupDebtors(jobs, t),
    total: owed.reduce((a, b) => a + b, 0),
    bands: AGE_BANDS.map((b, i) => ({ label: t(`Siku ${b.label}`, `${b.label} days`), owed: owed[i] })),
    over60: owed[2] + owed[3],
  };
}

export const debtorsFilename = (r: DebtorReport) =>
  r.scope === "all"
    ? r.t(`zuraja_madeni_hadi_${r.today}.pdf`, `zuraja_debtors_as_of_${r.today}.pdf`)
    : r.t(`zuraja_madeni_${r.params.from}_hadi_${r.params.to}.pdf`, `zuraja_debtors_${r.params.from}_to_${r.params.to}.pdf`);
