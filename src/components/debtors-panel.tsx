import Link from "next/link";
import { Icon } from "@/components/icons";
import type { DebtorReport } from "@/lib/debtor-data";
import { owedOn } from "@/lib/debtor-report";
import { cargoLine, formatMoney } from "@/lib/format";
import { formatDay } from "@/lib/report-params";

// Ripoti's Madeni tab: who owes what and for how long, with the printable debtors PDF. By default it
// covers everything still owed today; "Kipindi hiki" keeps only jobs dated in the report's period.
// The car filter applies to both.
const BAND_BG = ["bg-ok", "bg-warn/60", "bg-warn", "bg-danger"];
const ageTone = (days: number) => (days > 60 ? "bg-danger-soft text-danger" : days > 30 ? "bg-warn-soft text-warn" : "bg-background text-muted");

export function DebtorsPanel({
  report: r,
  pdfHref,
  allHref,
  periodHref,
}: {
  report: DebtorReport;
  pdfHref: string;
  allHref: string;
  periodHref: string;
}) {
  const { t } = r;
  const scopeLink = "rounded-full px-3 py-1.5 text-xs font-medium aria-[current=page]:bg-accent aria-[current=page]:text-accent-fg aria-[current=page]:shadow-sm text-muted hover:text-foreground";

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="inline-flex rounded-full border border-line bg-background p-0.5" aria-label={t("Madeni yapi", "Which debts")}>
          <Link href={allHref} scroll={false} aria-current={r.scope === "all" ? "page" : undefined} className={scopeLink}>
            {t("Yote hadi leo", "All up to today")}
          </Link>
          <Link href={periodHref} scroll={false} aria-current={r.scope === "period" ? "page" : undefined} className={scopeLink}>
            {t("Za kipindi hiki", "This period's")}
          </Link>
        </nav>
        <a href={pdfHref} download className="btn btn-primary gap-2">
          <Icon name="pdf" className="size-4" />
          {t("Chapisha ripoti ya madeni", "Print the debtors report")}
        </a>
      </div>
      <p className="-mt-1 text-sm text-muted">
        {r.scopeLabel} · {r.carsLabel}
      </p>

      {r.debtors.length === 0 ? (
        <p className="rounded-xl bg-ok-soft py-6 text-center text-sm font-medium text-ok">
          {t("Hakuna deni. Kila mteja amelipa kazi zote hapa.", "Nothing owed. Every client has paid for every job here.")}
        </p>
      ) : (
        <>
          <div className="grid gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium">{t("Umri wa madeni", "How old the debts are")}</p>
              <p className="font-semibold text-warn tabular-nums">{formatMoney(r.total)}</p>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-line">
              {r.bands.map((b, i) => b.owed > 0 && <span key={b.label} className={BAND_BG[i]} style={{ flexGrow: b.owed }} title={`${b.label}: ${formatMoney(b.owed)}`} />)}
            </div>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {r.bands.map((b, i) => (
                <div key={b.label} className="rounded-lg border border-line px-3 py-2">
                  <dt className="flex items-center gap-1.5 text-xs text-muted">
                    <span className={`size-2 rounded-sm ${BAND_BG[i]}`} />
                    {b.label}
                  </dt>
                  <dd className="text-sm font-semibold tabular-nums">{formatMoney(b.owed)}</dd>
                </div>
              ))}
            </dl>
          </div>

          <ul className="divide-y divide-line rounded-xl border border-line">
            {r.debtors.map((d) => (
              <li key={d.customer}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 hover:bg-background [&::-webkit-details-marker]:hidden">
                    <Icon name="chevrons" className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{d.customer}</p>
                      <p className="text-xs text-muted">
                        {d.jobs.length === 1 ? t("Kazi 1", "1 job") : t(`Kazi ${d.jobs.length}`, `${d.jobs.length} jobs`)} ·{" "}
                        {t(`amelipa ${formatMoney(d.paid)} kati ya ${formatMoney(d.amount)}`, `paid ${formatMoney(d.paid)} of ${formatMoney(d.amount)}`)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-warn tabular-nums">{formatMoney(d.owed)}</p>
                      <span className={`rounded px-1.5 py-px text-xs font-medium ${ageTone(d.days)}`}>{t(`siku ${d.days}`, `${d.days} days`)}</span>
                    </div>
                  </summary>
                  <ul className="divide-y divide-line border-t border-line bg-background/60 px-3">
                    {d.jobs.map((j) => (
                      <li key={j.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="whitespace-nowrap">{formatDay(j.at)}</span>
                            {j.invoice_number && <span className="text-muted">{j.invoice_number}</span>}
                            <span className="plate">{j.plate ?? t("Bila gari", "No car")}</span>
                          </p>
                          {cargoLine(j, t) && <p className="mt-0.5 break-words text-muted">{cargoLine(j, t)}</p>}
                        </div>
                        <div className="shrink-0 text-right tabular-nums">
                          <p className="font-medium text-warn">{formatMoney(owedOn(j))}</p>
                          {j.paid > 0 && <p className="text-xs text-muted">{t(`kati ya ${formatMoney(j.amount)}`, `of ${formatMoney(j.amount)}`)}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
