import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { Debtor } from "@/lib/incomes";

const SHOWN = 4;

const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const age = (days: number) => (days === 0 ? "leo" : days === 1 ? "siku 1" : `siku ${days}`);

// This month's mapato taken apart like a receipt: the money that came in plus what clients still owe
// adds up to the total the tiles show. Beside it, every client who owes, with how much of their jobs
// they have paid. `madeniHref` is where payments are taken, for the meneja only.
export function IncomeBreakdown({
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
  const total = Number(thisMonth);
  const due = Number(thisMonthOwed);
  const paid = total - due;
  const allOwed = Number(owed);
  const older = allOwed - due;

  return (
    <section className="card grid gap-6 lg:grid-cols-2 lg:gap-8" aria-label="Mapato na madeni">
      <div>
        <h2 className="font-semibold">Mapato mwezi huu yanavyoundwa</h2>
        <p className="text-sm text-muted">Kila kazi inahesabiwa kwa thamani yake yote, hata kama mteja bado anadaiwa.</p>

        <SplitBar paid={paid} due={due} className="mt-4 h-4" />

        <dl className="mt-4 grid gap-2 text-sm">
          <SumLine swatch="bg-ok" label="Pesa iliyoingia" value={paid} share={percent(paid, total)} />
          <SumLine swatch="owed-stripes" label="Deni la wateja" value={due} share={percent(due, total)} sign="+" warn={due > 0} />
          <div className="flex items-baseline justify-between gap-3 border-t-2 border-foreground/70 pt-2 font-semibold">
            <dt className="flex items-center">
              <span className="inline-block w-3 text-muted">=</span>
              <span className="mx-2 inline-block size-3" aria-hidden />
              Mapato mwezi huu
            </dt>
            <dd className="shrink-0 text-ok tabular-nums">{formatMoney(total)}</dd>
          </div>
        </dl>
      </div>

      <div className="border-t border-line pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-semibold">Madeni yote</h2>
          {madeniHref && allOwed > 0 && (
            <Link href={madeniHref} className="text-sm font-medium text-accent underline">
              Pokea malipo →
            </Link>
          )}
        </div>

        {allOwed === 0 ? (
          <p className="mt-3 rounded-lg bg-ok-soft px-3 py-4 text-center text-sm font-medium text-ok">
            Hakuna mteja anayedaiwa. Pesa yote imeingia.
          </p>
        ) : (
          <>
            <p className="figure mt-1 text-warn">{formatMoney(allOwed)}</p>
            <p className="text-xs text-muted">
              {debtors.length === 1 ? "Mteja 1 anadaiwa" : `Wateja ${debtors.length} wanadaiwa`}
              {older > 0 && ` · ${formatMoney(due)} ya mwezi huu, ${formatMoney(older)} ya miezi iliyopita`}
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
                    <SplitBar paid={amount - left} due={left} className="mt-1.5 h-1.5" />
                    <p className="mt-1 text-xs text-muted">
                      Amelipa {percent(amount - left, amount)}% ya {formatMoney(amount)}
                      {d.jobs > 1 && ` · kazi ${d.jobs}`}
                      {d.plates && ` · ${d.plates}`} · tangu {age(d.days)}
                    </p>
                  </li>
                );
              })}
            </ul>
            {debtors.length > SHOWN && (
              <p className="text-xs text-muted">
                Na {debtors.length - SHOWN === 1 ? "mwingine 1" : `wengine ${debtors.length - SHOWN}`} (
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
function SplitBar({ paid, due, className }: { paid: number; due: number; className: string }) {
  const whole = paid + due;
  return (
    <div
      role="img"
      aria-label={`Imeingia ${formatMoney(paid)}, deni ${formatMoney(due)}`}
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
