import { formatMoney, keepMinus } from "@/lib/format";

type Totals = { income: string; spend: string; owed: string };

// The money position in plain words: what came in (mapato), what went out (matumizi), the salio
// between them, what clients still owe (madeni) and the cash actually in hand once debts are left out.
// Shown for this month and since the start, so every role that sees money reads it the same way.
export function BalanceCard({ month, allTime }: { month: Totals; allTime: Totals }) {
  return (
    <section className="card" aria-label="Salio na madeni">
      <h2 className="font-semibold">Salio na madeni</h2>
      <p className="text-sm text-muted">
        Salio ni mapato toa matumizi. Pesa mkononi ni salio bila madeni ambayo wateja bado hawajalipa.
      </p>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 sm:gap-8">
        <Column title="Mwezi huu" totals={month} />
        <Column title="Tangu mwanzo" totals={allTime} className="border-t border-line pt-5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8" />
      </div>
    </section>
  );
}

function Column({ title, totals, className = "" }: { title: string; totals: Totals; className?: string }) {
  const income = Number(totals.income);
  const spend = Number(totals.spend);
  const owed = Number(totals.owed);
  const balance = income - spend;
  const cash = balance - owed;
  return (
    <div className={className}>
      <h3 className="text-xs font-medium tracking-wide text-muted uppercase">{title}</h3>
      <dl className="mt-2 grid gap-2 text-sm">
        <Line label="Mapato" value={formatMoney(income)} tone="text-ok" />
        <Line label="Matumizi" value={formatMoney(spend)} />
        <div className="flex items-baseline justify-between gap-3 border-t-2 border-foreground/70 pt-2 font-semibold">
          <dt>Salio</dt>
          <dd className={`tabular-nums ${balance < 0 ? "text-danger" : "text-ok"}`}>{keepMinus(formatMoney(balance))}</dd>
        </div>
        <Line label="Madeni ya wateja" value={formatMoney(owed)} tone={owed > 0 ? "text-warn" : undefined} />
        <Line label="Pesa mkononi" value={keepMinus(formatMoney(cash))} tone={cash < 0 ? "text-danger" : undefined} bold />
      </dl>
    </div>
  );
}

function Line({ label, value, tone, bold }: { label: string; value: string; tone?: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt>{label}</dt>
      <dd className={`shrink-0 tabular-nums ${bold ? "font-semibold" : ""} ${tone ?? ""}`}>{value}</dd>
    </div>
  );
}
