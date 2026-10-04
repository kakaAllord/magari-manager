import Link from "next/link";
import { LiveUpdates } from "@/components/live-updates";
import { CarMoneyCard, FuelCard, StatTile } from "@/components/overview-cards";
import { PageHeader } from "@/components/page-header";
import { getFuelOverview, periodRange } from "@/lib/fuel";
import { formatMoney } from "@/lib/format";
import { getIncomeTotals } from "@/lib/incomes";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { requireUser } from "@/lib/session";
import { getCarMoneyThisMonth, getOverview } from "@/lib/stats";
import { TIME_ZONE } from "@/lib/time";

const today = new Intl.DateTimeFormat("sw-TZ", { dateStyle: "full", timeZone: TIME_ZONE });

// What waits for the factory manager, the month's money, where every request is now, and each car's
// money, driver and fuel.
export default async function FactoryDashboard() {
  await requireUser("factory_manager");
  const [o, income, cars, fuel] = await Promise.all([
    getOverview(),
    getIncomeTotals(),
    getCarMoneyThisMonth(),
    getFuelOverview(periodRange("30")),
  ]);
  const balance = Number(income.this_month) - Number(o.this_month);
  const waiting = o.awaiting_authorisation_count;

  const stages = [
    { label: "Kwa meneja wa magari", count: o.pending_count, total: o.pending_total },
    { label: "Kwa idhini yako", count: waiting, total: o.awaiting_authorisation_total, href: "/factory/requests" },
    { label: "Kwa mhasibu kulipa", count: o.awaiting_issue_count, total: o.awaiting_issue_total },
    { label: "Yamelipwa, risiti bado", count: o.awaiting_receipt_count },
  ];

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader title="Dashibodi" description={today.format(new Date())} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Muhtasari">
        <StatTile
          label="Yanasubiri idhini yako"
          value={String(waiting)}
          tone={waiting > 0 ? "warn" : undefined}
          href="/factory/requests"
        >
          {waiting > 0 ? `${formatMoney(o.awaiting_authorisation_total)} · Yashughulikie` : "Hakuna linalosubiri"}
        </StatTile>
        <StatTile label="Mapato mwezi huu" value={formatMoney(income.this_month)} tone="ok">
          Mwezi uliopita {formatMoney(income.last_month)}
        </StatTile>
        <StatTile label="Matumizi mwezi huu" value={formatMoney(o.this_month)}>
          Wiki hii {formatMoney(o.this_week)}
        </StatTile>
        <StatTile label="Salio mwezi huu" value={formatMoney(balance)} tone={balance < 0 ? "danger" : "ok"}>
          Mapato toa matumizi
        </StatTile>
      </section>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
        <CarMoneyCard cars={cars} income={income.this_month} spend={o.this_month} reportHref="/factory/reports" />

        <div className="grid gap-6">
          <section className="card">
            <h2 className="font-semibold">Maombi yalipo sasa</h2>
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
              Magari {o.cars}
              {o.cars_without_driver > 0 && ` (${o.cars_without_driver} hayana dereva)`} · Madereva {o.drivers}
              {o.drivers_without_car > 0 && ` (${o.drivers_without_car} hawana gari)`}
            </p>
          </section>

          <FuelCard fuel={fuel} href="/factory/fuel" />
        </div>
      </div>
    </main>
  );
}
