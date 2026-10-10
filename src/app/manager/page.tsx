import Link from "next/link";
import { BalanceCard } from "@/components/balance-card";
import { LiveUpdates } from "@/components/live-updates";
import { IncomeBreakdown } from "@/components/income-breakdown";
import { NoDebtLine } from "@/components/overview-cards";
import { PageHeader } from "@/components/page-header";
import { formatMoney, formatToday, keepMinus } from "@/lib/format";
import { getIncomeTotals, listDebtors } from "@/lib/incomes";
import { AwaitingIssue } from "@/components/awaiting-issue";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { requireUser } from "@/lib/session";
import { getMonthlyIncomeAndSpend, getOverview, getSpendByCarThisMonth } from "@/lib/stats";
import { MoneyChart } from "./money-chart";


export default async function DashboardPage() {
  await requireUser("manager");
  const [o, income, debtors, monthly, byCar] = await Promise.all([
    getOverview(),
    getIncomeTotals(),
    listDebtors(),
    getMonthlyIncomeAndSpend(6),
    getSpendByCarThisMonth(),
  ]);
  const spentCars = byCar.filter((c) => Number(c.total) > 0).length;
  const balance = Number(income.this_month) - Number(o.this_month);

  return (
      <main className="page">
        <LiveUpdates channel={MANAGERS_CHANNEL} />
        <PageHeader title="Dashibodi" description={formatToday()} />

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-3" aria-label="Muhtasari">
          <Tile label="Mapato mwezi huu" value={formatMoney(income.this_month)} tone="ok" href="/manager/income">
            Mwezi uliopita {formatMoney(income.last_month)}
            {Number(income.this_month_owed) > 0 && (
              <>
                <br />
                Ndani yake deni {formatMoney(income.this_month_owed)}
              </>
            )}
          </Tile>
          <Tile label="Matumizi mwezi huu" value={formatMoney(o.this_month)}>
            Wiki hii {formatMoney(o.this_week)}
            <br />
            Mwezi uliopita {formatMoney(o.last_month)}
          </Tile>
          <Tile label="Salio mwezi huu" value={formatMoney(balance)} tone={balance < 0 ? "danger" : "ok"}>
            Mapato toa matumizi
            <NoDebtLine balance={balance} owed={income.this_month_owed} />
          </Tile>
          <Tile
            label="Yanasubiri idhini"
            value={String(o.pending_count)}
            tone={o.pending_count > 0 ? "warn" : undefined}
            href="/manager/requests"
          >
            {o.pending_count > 0 ? `${formatMoney(o.pending_total)} · Yashughulikie` : "Hakuna linalosubiri"}
            <AwaitingIssue
              authorisation={{ count: o.awaiting_authorisation_count, total: o.awaiting_authorisation_total }}
              issue={{ count: o.awaiting_issue_count, total: o.awaiting_issue_total }}
            />
          </Tile>
          <Tile label="Magari" value={String(o.cars)} href="/manager/cars">
            {o.cars_without_driver === 0 ? "Yote yana madereva" : `${o.cars_without_driver} hayana dereva`}
          </Tile>
          <Tile label="Madereva" value={String(o.drivers)} href="/manager/drivers">
            {o.drivers_without_car === 0 ? "Wote wana magari" : `${o.drivers_without_car} hawana gari`}
          </Tile>
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
          madeniHref="/manager/income?tab=madeni"
        />

        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <section className="card">
            <h2 className="font-semibold">Mapato na matumizi kwa mwezi</h2>
            <p className="mb-4 text-sm text-muted">
              Miezi 6 iliyopita · tangu mwanzo mapato {formatMoney(income.all_time)}, matumizi {formatMoney(o.all_time)}
            </p>
            <MoneyChart data={monthly.toReversed()} />
          </section>

          <section className="card">
            <h2 className="font-semibold">Mwezi huu kwa gari</h2>
            <p className="mb-3 text-sm text-muted">
              Magari {spentCars} kati ya {byCar.length} yametumia pesa mwezi huu
            </p>
            {byCar.length === 0 ? (
              <p className="text-sm text-muted">Bado hakuna gari.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="sr-only">
                  <tr>
                    <th>Gari</th>
                    <th>Matumizi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {byCar.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 pr-2">
                        <span className="plate">{c.plate}</span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {[c.car, c.driver ?? "Hakuna dereva"].filter(Boolean).join(" · ")}
                        </span>
                      </td>
                      <td className="py-2 text-right align-top tabular-nums">
                        <span className="font-medium">{formatMoney(c.total)}</span>
                        <span className="block text-xs text-muted">
                          {c.count === 1 ? "ombi 1" : `maombi ${c.count}`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </main>
  );
}

const valueColor = { ok: "text-ok", warn: "text-warn", danger: "text-danger" };

function Tile({
  label,
  value,
  tone,
  href,
  children,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "danger";
  href?: string;
  children: React.ReactNode;
}) {
  const body = (
    <>
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className={`figure mt-1 ${tone ? valueColor[tone] : ""}`}>{keepMinus(value)}</p>
      <p className="mt-1 text-xs text-muted">{children}</p>
    </>
  );
  const className = `card @container block ${tone === "warn" ? "border-warn/50 bg-warn-soft" : ""}`;
  return href ? (
    <Link href={href} className={`${className} hover:border-accent`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
