import { getT } from "@/lib/lang";
import { BalanceCard } from "@/components/balance-card";
import { LiveUpdates } from "@/components/live-updates";
import { IncomeBreakdown } from "@/components/income-breakdown";
import { CarMoneyCard, FuelCard, NoDebtLine, StatTile } from "@/components/overview-cards";
import { PageHeader } from "@/components/page-header";
import { getFuelOverview, periodRange } from "@/lib/fuel";
import { formatMoney, formatToday, keepMinus } from "@/lib/format";
import { getIncomeTotals, listDebtors } from "@/lib/incomes";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { requireUser } from "@/lib/session";
import { getCarMoneyThisMonth, getOverview } from "@/lib/stats";


// An overview of what has been done: money in and out, per car, and how the fuel is going.
// Who asked, approved or paid what lives in the reports, not here.
export default async function DirectorDashboard() {
  await requireUser("director");
  const t = await getT();
  const [o, income, debtors, cars, fuel] = await Promise.all([
    getOverview(),
    getIncomeTotals(),
    listDebtors(),
    getCarMoneyThisMonth(),
    getFuelOverview(periodRange("30")),
  ]);
  const balance = Number(income.this_month) - Number(o.this_month);
  const lastBalance = Number(income.last_month) - Number(o.last_month);
  const allTime = Number(income.all_time) - Number(o.all_time);

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader title={t("Dashibodi", "Dashboard")} description={formatToday(t)} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={t("Muhtasari wa mwezi huu", "This month's summary")}>
        <StatTile label={t("Mapato mwezi huu", "Income this month")} value={formatMoney(income.this_month)} tone="ok">
          {t("Mwezi uliopita", "Last month")} {formatMoney(income.last_month)}
          {Number(income.this_month_owed) > 0 && (
            <>
              <br />
              {t("Ndani yake deni", "Of which owed")} {formatMoney(income.this_month_owed)}
            </>
          )}
        </StatTile>
        <StatTile label={t("Matumizi mwezi huu", "Spending this month")} value={formatMoney(o.this_month)}>
          {t("Mwezi uliopita", "Last month")} {formatMoney(o.last_month)}
        </StatTile>
        <StatTile label={t("Salio mwezi huu", "Balance this month")} value={formatMoney(balance)} tone={balance < 0 ? "danger" : "ok"}>
          {t("Mwezi uliopita", "Last month")} {keepMinus(formatMoney(lastBalance))}
          <NoDebtLine balance={balance} owed={income.this_month_owed} />
        </StatTile>
        <StatTile label={t("Salio tangu mwanzo", "Balance since the start")} value={formatMoney(allTime)} tone={allTime < 0 ? "danger" : "ok"}>
          {t("Mapato", "Income")} {formatMoney(income.all_time)}
          <NoDebtLine balance={allTime} owed={income.owed} />
        </StatTile>
      </section>

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

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
        <CarMoneyCard cars={cars} reportHref="/director/reports" />
        <FuelCard fuel={fuel} href="/director/fuel" />
      </div>
    </main>
  );
}
