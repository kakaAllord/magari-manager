import Link from "next/link";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { getFuelOverview, periodRange } from "@/lib/fuel";
import { formatMoney, formatRate, keepMinus } from "@/lib/format";
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
  // The "no car" row only shows when something was booked without a car this month.
  const rows = cars.filter((c) => c.id !== null || Number(c.income) || Number(c.spend));
  const flagged = fuel.stretches.filter((s) => s.flag).length;

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader title="Dashibodi" description={today.format(new Date())} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Muhtasari wa mwezi huu">
        <Tile label="Mapato mwezi huu" value={formatMoney(income.this_month)} tone="ok">
          Mwezi uliopita {formatMoney(income.last_month)}
        </Tile>
        <Tile label="Matumizi mwezi huu" value={formatMoney(o.this_month)}>
          Mwezi uliopita {formatMoney(o.last_month)}
        </Tile>
        <Tile label="Salio mwezi huu" value={formatMoney(balance)} tone={balance < 0 ? "danger" : "ok"}>
          Mwezi uliopita {formatMoney(lastBalance)}
        </Tile>
        <Tile label="Salio tangu mwanzo" value={formatMoney(allTime)} tone={allTime < 0 ? "danger" : "ok"}>
          Mapato {formatMoney(income.all_time)}
        </Tile>
      </section>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
        <section className="card">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">Kila gari mwezi huu</h2>
            <Link href="/director/reports" className="text-sm font-medium text-accent underline">
              Ripoti kamili →
            </Link>
          </div>
          {/* Phones: four money columns don't fit, so each car is a row with its balance on the right. */}
          <ul className="divide-y divide-line text-sm sm:hidden">
            {rows.map((c) => {
              const net = Number(c.income) - Number(c.spend);
              return (
                <li key={c.id ?? "none"} className="py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {c.plate ? <span className="plate">{c.plate}</span> : "Bila gari"}
                      {c.car && <span className="ml-2 text-xs text-muted">{c.car}</span>}
                    </div>
                    <span className={`shrink-0 font-semibold tabular-nums ${net < 0 ? "text-danger" : "text-ok"}`}>
                      {formatMoney(net)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted tabular-nums">
                    Mapato <span className="text-ok">{formatMoney(c.income)}</span> · Matumizi{" "}
                    <span className="text-foreground">{formatMoney(c.spend)}</span>
                  </p>
                </li>
              );
            })}
            <li className="flex items-start justify-between gap-3 py-2.5 font-semibold">
              Jumla
              <span className={`tabular-nums ${balance < 0 ? "text-danger" : "text-ok"}`}>{formatMoney(balance)}</span>
            </li>
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="table">
              <thead>
                <tr>
                  <th>Gari</th>
                  <th className="num">Mapato</th>
                  <th className="num">Matumizi</th>
                  <th className="num">Salio</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const net = Number(c.income) - Number(c.spend);
                  return (
                    <tr key={c.id ?? "none"}>
                      <td>
                        {c.plate ? <span className="plate">{c.plate}</span> : "Bila gari"}
                        {c.car && <span className="mt-0.5 block text-xs text-muted">{c.car}</span>}
                      </td>
                      <td className="num text-ok">{formatMoney(c.income)}</td>
                      <td className="num">{formatMoney(c.spend)}</td>
                      <td className={`num font-medium ${net < 0 ? "text-danger" : "text-ok"}`}>{formatMoney(net)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td>Jumla</td>
                  <td className="num text-ok">{formatMoney(income.this_month)}</td>
                  <td className="num">{formatMoney(o.this_month)}</td>
                  <td className={`num ${balance < 0 ? "text-danger" : "text-ok"}`}>{formatMoney(balance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">Mafuta, siku 30</h2>
            <Link href="/director/fuel" className="text-sm font-medium text-accent underline">
              Zaidi →
            </Link>
          </div>
          <p className="text-sm text-muted">
            Km {fuel.all.km.toLocaleString("en")} · wastani {formatRate(fuel.all.kmPerLitre)} km/L
            {fuel.all.costPerKm !== null && ` · ${formatMoney(fuel.all.costPerKm)} kwa km`}
          </p>
          <ul className="mt-2 divide-y divide-line">
            {fuel.cars.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="plate">{c.plate}</span>
                  <span className="ml-2 text-muted">{c.driver ?? "Hana dereva"}</span>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  <span className="font-semibold">{formatRate(c.totals.kmPerLitre)}</span>
                  <span className="text-xs text-muted"> km/L</span>
                  {c.totals.flagged > 0 && <span className="ml-2 text-xs font-medium text-warn">⚠ {c.totals.flagged}</span>}
                </span>
              </li>
            ))}
          </ul>
          {flagged > 0 && (
            <p className="mt-2 text-xs font-medium text-warn">
              Vipindi {flagged} vina matumizi ya kutiliwa shaka.{" "}
              <Link href="/director/fuel?kipindi=30&tab=vipindi" className="underline">
                Viangalie
              </Link>
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

function Tile({
  label,
  value,
  tone,
  children,
}: {
  label: string;
  value: string;
  tone?: "ok" | "danger";
  children: React.ReactNode;
}) {
  const valueColor = { ok: "text-ok", danger: "text-danger" };
  return (
    <div className="card @container">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className={`figure mt-1 ${tone ? valueColor[tone] : ""}`}>{keepMinus(value)}</p>
      <p className="mt-1 text-xs text-muted">{children}</p>
    </div>
  );
}
