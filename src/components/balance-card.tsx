import type { Tr } from "@/lib/i18n";
import { getT } from "@/lib/lang";
import { formatMoney, keepMinus } from "@/lib/format";

type Totals = { income: string; spend: string; owed: string };

// The money position in plain words: what came in (mapato), what went out (matumizi), the salio
// between them, what clients still owe (madeni) and the cash actually in hand once debts are left out.
// Shown for this month and since the start, so every role that sees money reads it the same way.
export async function BalanceCard({ month, allTime }: { month: Totals; allTime: Totals }) {
  const t = await getT();
  return (
    <section className="card" aria-label={t("Salio na madeni", "Balance and debts")}>
      <h2 className="font-semibold">{t("Salio na madeni", "Balance and debts")}</h2>
      <p className="text-sm text-muted">
        {t(
          "Salio ni mapato toa matumizi. Pesa mkononi ni salio bila madeni ambayo wateja bado hawajalipa.",
          "The balance is income minus spending. Cash in hand is the balance without the debts clients haven't paid yet.",
        )}
      </p>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 sm:gap-8">
        <Column t={t} title={t("Mwezi huu", "This month")} totals={month} />
        <Column t={t} title={t("Tangu mwanzo", "Since the start")} totals={allTime} className="border-t border-line pt-5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8" />
      </div>
    </section>
  );
}

function Column({ t, title, totals, className = "" }: { t: Tr; title: string; totals: Totals; className?: string }) {
  const income = Number(totals.income);
  const spend = Number(totals.spend);
  const owed = Number(totals.owed);
  const balance = income - spend;
  const cash = balance - owed;
  return (
    <div className={className}>
      <h3 className="text-xs font-medium tracking-wide text-muted uppercase">{title}</h3>
      <dl className="mt-2 grid gap-2 text-sm">
        <Line label={t("Mapato", "Income")} value={formatMoney(income)} tone="text-ok" />
        <Line label={t("Matumizi", "Spending")} value={formatMoney(spend)} />
        <div className="flex items-baseline justify-between gap-3 border-t-2 border-foreground/70 pt-2 font-semibold">
          <dt>{t("Salio", "Balance")}</dt>
          <dd className={`tabular-nums ${balance < 0 ? "text-danger" : "text-ok"}`}>{keepMinus(formatMoney(balance))}</dd>
        </div>
        <Line label={t("Madeni ya wateja", "Client debts")} value={formatMoney(owed)} tone={owed > 0 ? "text-warn" : undefined} />
        <Line label={t("Pesa mkononi", "Cash in hand")} value={keepMinus(formatMoney(cash))} tone={cash < 0 ? "text-danger" : undefined} bold />
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
