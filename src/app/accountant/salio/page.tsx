import { BalanceCard } from "@/components/balance-card";
import { IncomeBreakdown } from "@/components/income-breakdown";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { formatMoney, formatToday } from "@/lib/format";
import { getIncomeTotals, listDebtors } from "@/lib/incomes";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { requireUser } from "@/lib/session";
import { getMonthlyIncomeAndSpend, getOverview } from "@/lib/stats";
import { MoneyChart } from "@/app/manager/money-chart";

// The accountant's view of the money: mapato, matumizi, madeni and the salio, read-only.
export default async function AccountantDashboard() {
  await requireUser("accountant");
  const [o, income, debtors, monthly] = await Promise.all([
    getOverview(),
    getIncomeTotals(),
    listDebtors(),
    getMonthlyIncomeAndSpend(6),
  ]);

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader title="Dashibodi" description={formatToday()} />

      <BalanceCard
        month={{ income: income.this_month, spend: o.this_month, owed: income.this_month_owed }}
        allTime={{ income: income.all_time, spend: o.all_time, owed: income.owed }}
      />

      <IncomeBreakdown
        thisMonth={income.this_month}
        thisMonthOwed={income.this_month_owed}
        owed={income.owed}
        debtors={debtors}
      />

      <section className="card">
        <h2 className="font-semibold">Mapato na matumizi kwa mwezi</h2>
        <p className="mb-4 text-sm text-muted">
          Miezi 6 iliyopita · tangu mwanzo mapato {formatMoney(income.all_time)}, matumizi {formatMoney(o.all_time)}
        </p>
        <MoneyChart data={monthly.toReversed()} />
      </section>
    </main>
  );
}
