import { getT } from "@/lib/lang";
import Link from "next/link";
import { BalanceCard } from "@/components/balance-card";
import { LiveUpdates } from "@/components/live-updates";
import { IncomeBreakdown } from "@/components/income-breakdown";
import { CarMoneyCard, FuelCard, NoDebtLine, StatTile } from "@/components/overview-cards";
import { PageHeader } from "@/components/page-header";
import { getFuelOverview, periodRange } from "@/lib/fuel";
import { formatMoney, formatToday } from "@/lib/format";
import { getIncomeTotals, listDebtors } from "@/lib/incomes";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { requireUser } from "@/lib/session";
import { getCarMoneyThisMonth, getOverview } from "@/lib/stats";


// What waits for the factory manager, the month's money, where every request is now, and each car's
// money, driver and fuel.
export default async function FactoryDashboard() {
  await requireUser("factory_manager");
  const t = await getT();
  const [o, income, debtors, cars, fuel] = await Promise.all([
    getOverview(),
    getIncomeTotals(),
    listDebtors(),
    getCarMoneyThisMonth(),
    getFuelOverview(periodRange("30")),
  ]);
  const balance = Number(income.this_month) - Number(o.this_month);
  const waiting = o.awaiting_authorisation_count;

  const stages = [
    { label: t("Kwa meneja", "With the vehicle manager"), count: o.pending_count, total: o.pending_total },
    { label: t("Kwa idhini yako", "For your authorisation"), count: waiting, total: o.awaiting_authorisation_total, href: "/factory/requests" },
    { label: t("Kwa mhasibu kulipa", "With the accountant to pay"), count: o.awaiting_issue_count, total: o.awaiting_issue_total },
    { label: t("Yamelipwa, risiti bado", "Paid, receipt to come"), count: o.awaiting_receipt_count },
  ];

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader title={t("Dashibodi", "Dashboard")} description={formatToday(t)} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={t("Muhtasari", "Summary")}>
        <StatTile
          label={t("Yanasubiri idhini yako", "Awaiting your authorisation")}
          value={String(waiting)}
          tone={waiting > 0 ? "warn" : undefined}
          href="/factory/requests"
        >
          {waiting > 0 ? `${formatMoney(o.awaiting_authorisation_total)} · ${t("Yashughulikie", "Deal with them")}` : t("Hakuna linalosubiri", "Nothing waiting")}
        </StatTile>
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
          {t("Wiki hii", "This week")} {formatMoney(o.this_week)}
        </StatTile>
        <StatTile label={t("Salio mwezi huu", "Balance this month")} value={formatMoney(balance)} tone={balance < 0 ? "danger" : "ok"}>
          {t("Mapato toa matumizi", "Income minus spending")}
          <NoDebtLine balance={balance} owed={income.this_month_owed} />
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
        <CarMoneyCard cars={cars} reportHref="/factory/reports" />

        <div className="grid gap-6">
          <section className="card">
            <h2 className="font-semibold">{t("Maombi yalipo sasa", "Where requests are now")}</h2>
            <ul className="mt-2 divide-y divide-line text-sm">
              {stages.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-3 py-2.5">
                  {s.href ? (
                    <Link href={s.href} className="font-medium text-accent underline">
                      {s.label}
                    </Link>
                  ) : (
                    <span>{s.label}</span>
                  )}
                  <span className="shrink-0 text-right tabular-nums">
                    <span className="font-semibold">{s.count}</span>
                    {s.total !== undefined && s.count > 0 && (
                      <span className="text-xs text-muted"> · {formatMoney(s.total)}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">
              {t("Magari", "Cars")} {o.cars}
              {o.cars_without_driver > 0 && t(` (${o.cars_without_driver} hayana dereva)`, ` (${o.cars_without_driver} without a driver)`)} ·{" "}
              {t("Madereva", "Drivers")} {o.drivers}
              {o.drivers_without_car > 0 && t(` (${o.drivers_without_car} hawana gari)`, ` (${o.drivers_without_car} without a car)`)}
            </p>
          </section>

          <FuelCard fuel={fuel} href="/factory/fuel" />
        </div>
      </div>
    </main>
  );
}
