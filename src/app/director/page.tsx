import { LiveUpdates } from "@/components/live-updates";
import { CarMoneyCard, FuelCard, StatTile } from "@/components/overview-cards";
import { PageHeader } from "@/components/page-header";
import { getFuelOverview, periodRange } from "@/lib/fuel";
import { formatMoney, keepMinus } from "@/lib/format";
import { getIncomeTotals } from "@/lib/incomes";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { requireUser } from "@/lib/session";
import { getCarMoneyThisMonth, getOverview } from "@/lib/stats";
import { TIME_ZONE } from "@/lib/time";

const today = new Intl.DateTimeFormat("sw-TZ", { dateStyle: "full", timeZone: TIME_ZONE });

// An overview of what has been done: money in and out, per car, and how the fuel is going.
// Who asked, approved or paid what lives in the reports, not here.
export default async function DirectorDashboard() {
  await requireUser("director");
  const [o, income, cars, fuel] = await Promise.all([
    getOverview(),
    getIncomeTotals(),
    getCarMoneyThisMonth(),
    getFuelOverview(periodRange("30")),
  ]);
  const balance = Number(income.this_month) - Number(o.this_month);
  const lastBalance = Number(income.last_month) - Number(o.last_month);
  const allTime = Number(income.all_time) - Number(o.all_time);

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader title="Dashibodi" description={today.format(new Date())} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Muhtasari wa mwezi huu">
        <StatTile label="Mapato mwezi huu" value={formatMoney(income.this_month)} tone="ok">
          Mwezi uliopita {formatMoney(income.last_month)}
        </StatTile>
        <StatTile label="Matumizi mwezi huu" value={formatMoney(o.this_month)}>
          Mwezi uliopita {formatMoney(o.last_month)}
        </StatTile>
        <StatTile label="Salio mwezi huu" value={formatMoney(balance)} tone={balance < 0 ? "danger" : "ok"}>
          Mwezi uliopita {keepMinus(formatMoney(lastBalance))}
        </StatTile>
        <StatTile label="Salio tangu mwanzo" value={formatMoney(allTime)} tone={allTime < 0 ? "danger" : "ok"}>
          Mapato {formatMoney(income.all_time)}
        </StatTile>
      </section>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
        <CarMoneyCard cars={cars} income={income.this_month} spend={o.this_month} reportHref="/director/reports" />
        <FuelCard fuel={fuel} href="/director/fuel" />
      </div>
    </main>
  );
}
