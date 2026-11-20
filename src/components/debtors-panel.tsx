import Link from "next/link";
import { Icon } from "@/components/icons";
import type { DebtorReport } from "@/lib/debtor-data";
import { owedOn } from "@/lib/debtor-report";
import { cargoLine, formatMoney } from "@/lib/format";
import { formatDay } from "@/lib/report-params";

// Ripoti's Madeni tab: who owes what and for how long, with the printable debtors PDF. By default it
// covers everything still owed today. The Chuja dialog narrows it to the report's period, to one
// client, or adds the jobs already paid in full; the car filter always applies. Each client opens to
// their jobs and a PDF of their own.
const BAND_BG = ["bg-ok", "bg-warn/60", "bg-warn", "bg-danger"];
const ageTone = (days: number) => (days > 60 ? "bg-danger-soft text-danger" : days > 30 ? "bg-warn-soft text-warn" : "bg-background text-muted");

export function DebtorsPanel({
  report: r,
  pdfHref,
  clientPdfHref,
  clientHref,
}: {
  report: DebtorReport;
  pdfHref: string;
  // The same report for one client: as a PDF, and on this tab.
  clientPdfHref: (key: string) => string;
  clientHref: (key: string) => string;
}) {
  const { t } = r;
  const paidUp = <span className="rounded bg-ok-soft px-1.5 py-px text-xs font-medium text-ok">{t("Amelipa yote", "All paid")}</span>;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-sm text-muted">
          {r.clientName && <span className="block font-semibold text-foreground">{r.clientName}</span>}
          {r.scopeLabel} · {r.carsLabel}
        </p>
        <a href={pdfHref} download className="btn btn-primary gap-2">
          <Icon name="pdf" className="size-4" />
          {r.filters.withPaid ? t("Pakua hesabu (PDF)", "Download the accounts (PDF)") : t("Chapisha ripoti ya madeni", "Print the debtors report")}
        </a>
      </div>

      {r.debtors.length === 0 ? (
        <p className="rounded-xl bg-ok-soft py-6 text-center text-sm font-medium text-ok">
          {r.filters.withPaid
            ? t("Hakuna kazi ya mteja hapa.", "No client's job here.")
            : t("Hakuna deni. Kila mteja amelipa kazi zote hapa.", "Nothing owed. Every client has paid for every job here.")}
        </p>
      ) : (
        <>
          <dl className="grid gap-2 sm:grid-cols-3">
            {[
              { label: t("Thamani ya kazi", "Value of the jobs"), value: r.amount, tone: "text-accent" },
              { label: t("Amelipa", "Paid"), value: r.paid, tone: "text-ok" },
              { label: t("Deni lililobaki", "Still owed"), value: r.total, tone: r.total > 0 ? "text-warn" : "text-ok" },
            ].map((x) => (
              <div key={x.label} className="flex items-baseline justify-between gap-3 rounded-lg border border-line px-3 py-2 sm:block">
                <dt className="text-xs text-muted">{x.label}</dt>
                <dd className={`text-sm font-semibold break-words tabular-nums ${x.tone}`}>{formatMoney(x.value)}</dd>
              </div>
            ))}
          </dl>

          {r.total > 0 && (
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
          )}

          <ul className="divide-y divide-line rounded-xl border border-line">
            {r.debtors.map((d) => (
              <li key={d.key}>
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
                      {d.owed > 0 ? (
                        <>
                          <p className="font-semibold text-warn tabular-nums">{formatMoney(d.owed)}</p>
                          <span className={`rounded px-1.5 py-px text-xs font-medium ${ageTone(d.days)}`}>{t(`siku ${d.days}`, `${d.days} days`)}</span>
                        </>
                      ) : (
                        paidUp
                      )}
                    </div>
                  </summary>
                  <div className="border-t border-line bg-background/60 px-3">
                  <ul className="divide-y divide-line">
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
                          {owedOn(j) > 0 ? (
                            <>
                              <p className="font-medium text-warn">{formatMoney(owedOn(j))}</p>
                              {j.paid > 0 && <p className="text-xs text-muted">{t(`kati ya ${formatMoney(j.amount)}`, `of ${formatMoney(j.amount)}`)}</p>}
                            </>
                          ) : (
                            <>
                              <p className="font-medium text-ok">{formatMoney(j.amount)}</p>
                              <p className="text-xs text-ok">{t("Imelipwa", "Paid")}</p>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap justify-end gap-2 border-t border-line py-2.5">
                    {!r.clientName && (
                      <Link href={clientHref(d.key)} scroll={false} className="btn btn-ghost text-sm">
                        {t("Mteja huyu tu", "Only this client")}
                      </Link>
                    )}
                    <a href={clientPdfHref(d.key)} download className="btn btn-ghost gap-2 text-sm">
                      <Icon name="pdf" className="size-4" />
                      {t("PDF ya mteja huyu", "This client's PDF")}
                    </a>
                  </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
