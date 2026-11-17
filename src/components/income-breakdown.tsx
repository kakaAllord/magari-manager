import type { Tr } from "@/lib/i18n";
import { getT } from "@/lib/lang";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { Debtor } from "@/lib/incomes";

const SHOWN = 4;

const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const age = (days: number, t: Tr) =>
  days === 0 ? t("leo", "today") : days === 1 ? t("siku 1", "1 day") : t(`siku ${days}`, `${days} days`);

// This month's mapato taken apart like a receipt: the money that came in plus what clients still owe
// adds up to the total the tiles show. Beside it, every client who owes, with how much of their jobs
// they have paid. `madeniHref` is where payments are taken, for the meneja only.
export async function IncomeBreakdown({
  thisMonth,
  thisMonthOwed,
  owed,
  debtors,
  madeniHref,
}: {
  thisMonth: string;
  thisMonthOwed: string;
  owed: string;
  debtors: Debtor[];
  madeniHref?: string;
}) {
  const t = await getT();
  const total = Number(thisMonth);
  const due = Number(thisMonthOwed);
  const paid = total - due;
  const allOwed = Number(owed);
  const older = allOwed - due;

  return (
    <section className="card grid gap-6 lg:grid-cols-2 lg:gap-8" aria-label={t("Mapato na madeni", "Income and debts")}>
      <div>
        <h2 className="font-semibold">{t("Mapato mwezi huu yanavyoundwa", "What this month's income is made of")}</h2>
        <p className="text-sm text-muted">
          {t("Kila kazi inahesabiwa kwa thamani yake yote, hata kama mteja bado anadaiwa.", "Every job counts at its full value, even when the client still owes.")}
        </p>

        <SplitBar paid={paid} due={due} className="mt-4 h-4" t={t} />

        <dl className="mt-4 grid gap-2 text-sm">
          <SumLine swatch="bg-ok" label={t("Pesa iliyoingia", "Money received")} value={paid} share={percent(paid, total)} />
          <SumLine swatch="owed-stripes" label={t("Deni la wateja", "Owed by clients")} value={due} share={percent(due, total)} sign="+" warn={due > 0} />
          <div className="flex items-baseline justify-between gap-3 border-t-2 border-foreground/70 pt-2 font-semibold">
            <dt className="flex items-center">
              <span className="inline-block w-3 text-muted">=</span>
              <span className="mx-2 inline-block size-3" aria-hidden />
              {t("Mapato mwezi huu", "Income this month")}
            </dt>
            <dd className="shrink-0 text-ok tabular-nums">{formatMoney(total)}</dd>
          </div>
        </dl>
      </div>

      <div className="border-t border-line pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-semibold">{t("Madeni yote", "All debts")}</h2>
          {madeniHref && allOwed > 0 && (
            <Link href={madeniHref} className="text-sm font-medium text-accent underline">
              {t("Pokea malipo", "Take a payment")} →
            </Link>
          )}
        </div>

        {allOwed === 0 ? (
          <p className="mt-3 rounded-lg bg-ok-soft px-3 py-4 text-center text-sm font-medium text-ok">
            {t("Hakuna mteja anayedaiwa. Pesa yote imeingia.", "No client owes anything. All the money is in.")}
          </p>
        ) : (
          <>
            <p className="figure mt-1 text-warn">{formatMoney(allOwed)}</p>
            <p className="text-xs text-muted">
              {debtors.length === 1 ? t("Mteja 1 anadaiwa", "1 client owes") : t(`Wateja ${debtors.length} wanadaiwa`, `${debtors.length} clients owe`)}
              {older > 0 &&
                t(
                  ` · ${formatMoney(due)} ya mwezi huu, ${formatMoney(older)} ya miezi iliyopita`,
                  ` · ${formatMoney(due)} from this month, ${formatMoney(older)} from earlier months`,
                )}
            </p>

            <ul className="mt-3 divide-y divide-line">
              {debtors.slice(0, SHOWN).map((d) => {
                const amount = Number(d.amount);
                const left = Number(d.owed);
                return (
                  <li key={d.customer} className="py-2.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <p className="min-w-0 truncate font-medium">{d.customer}</p>
                      <p className="shrink-0 font-semibold text-warn tabular-nums">{formatMoney(left)}</p>
                    </div>
                    <SplitBar paid={amount - left} due={left} className="mt-1.5 h-1.5" t={t} />
                    <p className="mt-1 text-xs text-muted">
                      {t(
                        `Amelipa ${percent(amount - left, amount)}% ya ${formatMoney(amount)}`,
                        `Paid ${percent(amount - left, amount)}% of ${formatMoney(amount)}`,
                      )}
                      {d.jobs > 1 && t(` · kazi ${d.jobs}`, ` · ${d.jobs} jobs`)}
                      {d.plates && ` · ${d.plates}`} · {t(`tangu ${age(d.days, t)}`, `for ${age(d.days, t)}`)}
                    </p>
                  </li>
                );
              })}
            </ul>
            {debtors.length > SHOWN && (
              <p className="text-xs text-muted">
                {t(
                  `Na ${debtors.length - SHOWN === 1 ? "mwingine 1" : `wengine ${debtors.length - SHOWN}`}`,
                  `And ${debtors.length - SHOWN} more`,
                )}{" "}
                (
                {formatMoney(debtors.slice(SHOWN).reduce((s, d) => s + Number(d.owed), 0))})
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// Paid money in solid green, what is still owed striped amber, on one track.
function SplitBar({ paid, due, className, t }: { paid: number; due: number; className: string; t: Tr }) {
  const whole = paid + due;
  return (
    <div
      role="img"
      aria-label={t(`Imeingia ${formatMoney(paid)}, deni ${formatMoney(due)}`, `Received ${formatMoney(paid)}, owed ${formatMoney(due)}`)}
      className={`flex gap-0.5 overflow-hidden rounded-full bg-line ${className}`}
    >
      {paid > 0 && <span className="h-full bg-ok" style={{ width: `${(paid / whole) * 100}%` }} />}
      {due > 0 && <span className="owed-stripes h-full" style={{ width: `${(due / whole) * 100}%` }} />}
    </div>
  );
}

function SumLine({
  swatch,
  label,
  value,
  share,
  sign,
  warn = false,
}: {
  swatch: string;
  label: string;
  value: number;
  share: number;
  sign?: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="flex min-w-0 items-center">
        <span className="inline-block w-3 shrink-0 text-muted">{sign}</span>
        <span className={`mx-2 inline-block size-3 shrink-0 rounded-sm ${swatch}`} aria-hidden />
        <span className="truncate">{label}</span>
        <span className="ml-2 text-xs text-muted tabular-nums">{share}%</span>
      </dt>
      <dd className={`shrink-0 tabular-nums ${warn ? "font-medium text-warn" : ""}`}>{formatMoney(value)}</dd>
    </div>
  );
}
