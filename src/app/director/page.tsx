import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { listActivity, type Activity } from "@/lib/activity";
import { formatDateTime, formatMoney } from "@/lib/format";
import { getIncomeTotals } from "@/lib/incomes";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { requireUser } from "@/lib/session";
import { getMonthlyIncomeAndSpend, getOverview } from "@/lib/stats";
import { TIME_ZONE } from "@/lib/time";

const today = new Intl.DateTimeFormat("sw-TZ", { dateStyle: "full", timeZone: TIME_ZONE });

export default async function DirectorDashboard() {
  await requireUser("director");
  const [o, income, months, activity] = await Promise.all([
    getOverview(),
    getIncomeTotals(),
    getMonthlyIncomeAndSpend(6),
    listActivity(25),
  ]);
  const balance = Number(income.this_month) - Number(o.this_month);

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
          Mapato toa matumizi
        </Tile>
        <Tile label="Yanasubiri idhini" value={String(o.pending_count)} tone={o.pending_count > 0 ? "warn" : undefined}>
          {o.pending_count > 0 ? `Jumla ${formatMoney(o.pending_total)}` : "Hakuna linalosubiri"}
        </Tile>
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <section className="card">
          <h2 className="font-semibold">Mapato na matumizi kwa mwezi</h2>
          <p className="mb-1 text-sm text-muted">Salio la kila mwezi, miezi 6 iliyopita. Matumizi ni maombi yaliyokubaliwa.</p>
          <ul className="divide-y divide-line">
            {months.map((m) => {
              const net = Number(m.income) - Number(m.spend);
              return (
                <li key={m.label} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{m.label}</p>
                    <p className="text-xs text-muted tabular-nums">
                      Mapato {formatMoney(m.income)} · Matumizi {formatMoney(m.spend)}
                    </p>
                  </div>
                  <p className={`shrink-0 font-semibold tabular-nums ${net < 0 ? "text-danger" : "text-ok"}`}>
                    {formatMoney(net)}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card">
          <h2 className="font-semibold">Kinachoendelea</h2>
          <p className="mb-2 text-sm text-muted">Maombi, maamuzi, mapato na mameneja wapya, vya karibuni juu</p>
          {activity.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Bado hakuna kilichotokea.</p>
          ) : (
            <ol className="divide-y divide-line">
              {activity.map((a, i) => (
                <ActivityItem key={i} activity={a} />
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}

const dot = {
  request: "bg-warn",
  approved: "bg-ok",
  rejected: "bg-danger",
  income: "bg-accent",
  manager: "bg-muted",
} as const;

function ActivityItem({ activity: a }: { activity: Activity }) {
  const who = a.actor ?? "Mtu asiyejulikana";
  let text: React.ReactNode;
  switch (a.kind) {
    case "request":
      text = <>{who} ameomba <b className="tabular-nums">{formatMoney(a.amount)}</b>: {a.detail}</>;
      break;
    case "approved":
      text = <>{who} amekubali ombi la <b className="tabular-nums">{formatMoney(a.amount)}</b>: {a.detail}</>;
      break;
    case "rejected":
      text = <>{who} amekataa ombi la <b className="tabular-nums">{formatMoney(a.amount)}</b>: {a.detail}</>;
      break;
    case "income":
      text = <>{who} amerekodi mapato ya <b className="tabular-nums">{formatMoney(a.amount)}</b> kutoka {a.detail}</>;
      break;
    case "manager":
      text = <>{who} ameongezwa kama meneja ({a.detail})</>;
      break;
  }
  return (
    <li className="flex gap-3 py-3">
      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${dot[a.kind]}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm break-words">{text}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          {a.plate && <span className="plate">{a.plate}</span>}
          {formatDateTime(a.at)}
        </p>
      </div>
    </li>
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
  tone?: "ok" | "warn" | "danger";
  children: React.ReactNode;
}) {
  const valueColor = { ok: "text-ok", warn: "text-warn", danger: "text-danger" };
  return (
    <div className={`card ${tone === "warn" ? "border-warn/50 bg-warn-soft" : ""}`}>
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums sm:text-2xl ${tone ? valueColor[tone] : ""}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{children}</p>
    </div>
  );
}
