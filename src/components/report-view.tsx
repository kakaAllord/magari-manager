import { getT } from "@/lib/lang";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { ReportToolbar } from "@/components/report-filters";
import { cargoLine, formatMoney, formatWallDate, formatWallTime, keepMinus } from "@/lib/format";
import { parseReportParams, presets, toSearch } from "@/lib/report-params";
import { CarProfit } from "@/components/car-profit";
import { DebtorsPanel } from "@/components/debtors-panel";
import { getDebtorReport } from "@/lib/debtor-data";
import { debtFilterEntries, debtFilterSearch } from "@/lib/debtor-report";
import { getExpenses, getIncomes, listCars, moneyByCar, sourceLabel, summarise, summariseIncome, todayInTanzania } from "@/lib/reports";

// The reports page, shared by both managers, the mhasibu and directors. `base` is the page's own path.
export async function ReportView({
  base,
  searchParams,
}: {
  base: "/manager/reports" | "/director/reports" | "/accountant/reports" | "/factory/reports";
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const t = await getT();
  const today = todayInTanzania();
  const params = parseReportParams(searchParams, today);
  const [cars, expenses, incomes, debts] = await Promise.all([listCars(), getExpenses(params), getIncomes(params), getDebtorReport(searchParams)]);
  const summary = summarise(expenses, cars, params, t);
  const income = summariseIncome(incomes, params, t);
  const balance = income.total - summary.grandTotal;
  const chosen = params.carIds.length ? cars.filter((c) => params.carIds.includes(c.id)) : cars;
  const byCar = moneyByCar(chosen, expenses, incomes, t);
  const search = toSearch(params);
  // Spending, income and debts share one card; the tab lives in the URL so filtering keeps it.
  const tab = searchParams.tab === "mapato" || searchParams.tab === "madeni" ? searchParams.tab : "matumizi";
  const debtSearch = debtFilterSearch(debts.filters);
  const tabSearch = (key: string) => (key === "matumizi" ? search : key === "madeni" ? `${search}&tab=madeni${debtSearch}` : `${search}&tab=${key}`);
  const debtorsPdf = `${base}/export?${search}&format=debtors${debtSearch}`;
  const forClient = (client: string) => `${search}${debtFilterSearch({ ...debts.filters, client })}`;

  return (
      <main className="page">
        <PageHeader
          title={t("Ripoti", "Reports")}
          description={t(
            "Mapato na matumizi kwa kipindi unachochagua. Matumizi ni pesa zilizotolewa na mhasibu, kwa tarehe ya kutolewa; mapato ni kwa tarehe ya kurekodiwa.",
            "Income and spending for the period you pick. Spending is money the accountant paid out, by the day it was paid; income is by the day it was recorded.",
          )}
        />

        <ReportToolbar
          presets={presets(today, t)}
          params={params}
          cars={cars}
          today={today}
          tab={tab}
          keep={tab === "madeni" ? {} : debtFilterEntries(debts.filters)}
          debt={tab === "madeni" ? { filters: debts.filters, clients: debts.clients } : undefined}
          downloads={[
            { label: "PDF", hint: t("Tayari kuchapisha au kutuma", "Ready to print or send"), href: `${base}/export?${search}&format=pdf`, icon: "pdf" },
            { label: "Excel", hint: t("Fomula, chati na majedwali ya kuchuja", "Formulas, charts and filterable tables"), href: `${base}/export?${search}`, icon: "sheet" },
            {
              label: debts.filters.withPaid ? t("Hesabu ya wateja (PDF)", "Client accounts (PDF)") : t("Madeni (PDF)", "Debtors (PDF)"),
              hint: debts.clientName ? `${debts.clientName} · ${debts.scopeLabel}` : debts.scopeLabel,
              href: debtorsPdf,
              icon: "wallet",
            },
          ]}
        />

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label={t("Jumla", "Totals")}>
          <Total
            tone="in"
            icon="moneyIn"
            label={t("Mapato", "Income")}
            value={income.total}
            note={income.count === 1 ? t("Rekodi 1", "1 record") : t(`Rekodi ${income.count}`, `${income.count} records`)}
          />
          <Total
            tone="out"
            icon="moneyOut"
            label={t("Matumizi", "Spending")}
            value={summary.grandTotal}
            note={summary.count === 1 ? t("Ombi 1 lililolipwa", "1 paid request") : t(`Maombi ${summary.count} yaliyolipwa`, `${summary.count} paid requests`)}
          />
          <Total
            wide
            tone={balance < 0 ? "negative" : "balance"}
            icon="wallet"
            label={t("Salio", "Balance")}
            value={balance}
            note={balance < 0 ? t("Matumizi yamezidi mapato", "Spending is above income") : t("Mapato toa matumizi", "Income minus spending")}
          />
        </section>

        <section className="card">
          <h2 className="font-semibold">{t("Faida kwa gari", "Profit by car")}</h2>
          <p className="text-sm text-muted">{t("Mapato ya kila gari ukilinganisha na matumizi yake katika kipindi hiki.", "Each car's income against its spending in this period.")}</p>
          <CarProfit
            rows={byCar.map((c) => ({
              key: String(c.id ?? "none"),
              plate: c.id === null ? null : c.label,
              sub: c.id === null ? null : c.car,
              income: c.income,
              spend: c.spend,
            }))}
          />
        </section>

        <section className="card grid gap-4">
          <nav className="-mx-4 -mt-4 flex border-b border-line sm:-mx-5 sm:-mt-5" aria-label={t("Matumizi, mapato au madeni", "Spending, income or debts")}>
            {(
              [
                { key: "matumizi", label: t("Matumizi", "Spending"), count: summary.count },
                { key: "mapato", label: t("Mapato", "Income"), count: income.count },
                { key: "madeni", label: t("Madeni", "Debts"), count: debts.debtors.length },
              ] as const
            ).map((x) => (
              <Link
                key={x.key}
                href={`?${tabSearch(x.key)}`}
                scroll={false}
                aria-current={tab === x.key ? "page" : undefined}
                className="flex flex-1 items-center justify-center gap-1.5 border-b-2 border-transparent px-2 py-3 sm:gap-2 sm:px-4 text-sm font-medium text-muted hover:text-foreground aria-[current=page]:border-accent aria-[current=page]:text-foreground"
              >
                {x.label}
                <span className="rounded-full bg-background px-2 text-xs tabular-nums">{x.count}</span>
              </Link>
            ))}
          </nav>

          {tab === "madeni" ? (
            <DebtorsPanel
              report={debts}
              pdfHref={debtorsPdf}
              clientPdfHref={(key) => `${base}/export?${forClient(key)}&format=debtors`}
              clientHref={(key) => `?${forClient(key)}&tab=madeni`}
            />
          ) : tab === "matumizi" ? (
            <>
              <p className="text-sm text-muted">
                {t(`Maombi ${summary.count}`, `${summary.count} requests`)} ·{" "}
                {params.carIds.length
                  ? t(`magari ${params.carIds.length} yaliyochaguliwa`, `${params.carIds.length} cars picked`)
                  : t(`magari yote (${cars.length})`, `all cars (${cars.length})`)}
              </p>

              {params.group === "car" ? (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{t("Gari", "Car")}</th>
                        <th className="num">{t("Maombi", "Requests")}</th>
                        <th className="num">{t("Jumla", "Total")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(summary.rows as (typeof summary.rows[number] & { sub?: string })[]).map((r) => (
                        <tr key={r.label}>
                          <td>
                            <span className="plate">{r.label}</span> <span className="text-muted">{r.sub}</span>
                          </td>
                          <td className="num">{r.count}</td>
                          <td className="num font-medium">{formatMoney(r.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>{t("Jumla", "Total")}</td>
                        <td className="num">{summary.count}</td>
                        <td className="num">{formatMoney(summary.grandTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{params.group === "month" ? t("Mwezi", "Month") : t("Wiki", "Week")}</th>
                        {summary.columns.map((c) => (
                          <th key={c.key} className="num">
                            {c.label}
                          </th>
                        ))}
                        <th className="num">{t("Jumla", "Total")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.rows.map((r) => (
                        <tr key={r.label}>
                          <td className="whitespace-nowrap">{r.label}</td>
                          {r.values.map((v, i) => (
                            <td key={summary.columns[i].key} className={`num ${v === 0 ? "text-muted" : ""}`}>
                              {v === 0 ? "–" : formatMoney(v)}
                            </td>
                          ))}
                          <td className="num font-medium">{formatMoney(r.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>{t("Jumla", "Total")}</td>
                        {summary.totals.map((sum, i) => (
                          <td key={summary.columns[i].key} className="num">
                            {formatMoney(sum)}
                          </td>
                        ))}
                        <td className="num">{formatMoney(summary.grandTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {expenses.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-sm font-medium">{t("Kila ombi na tarehe yake", "Every request and its date")} ({expenses.length})</summary>
                  <div className="mt-2 overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>{t("Tarehe", "Date")}</th>
                          <th>{t("Gari", "Car")}</th>
                          <th>{t("Namba ya PV", "PV number")}</th>
                          <th className="num">{t("Kiasi", "Amount")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map((e, i) => (
                          <tr key={i}>
                            <td className="whitespace-nowrap">{formatWallDate(e.issued_at)}</td>
                            <td>
                              <span className="plate">{e.plate ?? t("Hakuna gari", "No car")}</span>
                            </td>
                            <td className={`whitespace-nowrap ${e.voucher_number ? "" : "text-muted"}`}>{e.voucher_number ?? "–"}</td>
                            <td className="num font-medium">{formatMoney(e.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3}>{t("Jumla", "Total")}</td>
                          <td className="num">{formatMoney(summary.grandTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </details>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-muted">
                {income.count === 1 ? t("Rekodi 1", "1 record") : t(`Rekodi ${income.count}`, `${income.count} records`)} ·{" "}
                {params.group === "car" ? t("kwa chanzo", "by source") : params.group === "month" ? t("kwa mwezi", "by month") : t("kwa wiki", "by week")}
              </p>
              {income.rows.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">{t("Hakuna mapato katika kipindi hiki.", "No income in this period.")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{params.group === "car" ? t("Chanzo", "Source") : params.group === "month" ? t("Mwezi", "Month") : t("Wiki", "Week")}</th>
                        <th className="num">{t("Mara", "Times")}</th>
                        <th className="num">{t("Jumla", "Total")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {income.rows.map((r) => (
                        <tr key={r.label}>
                          <td className={params.group === "car" ? "break-words" : "whitespace-nowrap"}>{r.label}</td>
                          <td className={`num ${r.count === 0 ? "text-muted" : ""}`}>{r.count}</td>
                          <td className={`num font-medium ${r.total === 0 ? "text-muted" : "text-ok"}`}>
                            {r.total === 0 ? "–" : formatMoney(r.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>{t("Jumla", "Total")}</td>
                        <td className="num">{income.count}</td>
                        <td className="num text-ok">{formatMoney(income.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {incomes.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-sm font-medium">{t("Kila rekodi na tarehe yake", "Every record and its date")} ({incomes.length})</summary>
                  <ul className="mt-2 divide-y divide-line">
                    {incomes.map((x, i) => (
                      <li key={i} className="flex items-start justify-between gap-4 py-3">
                        <div className="min-w-0">
                          <p className="break-words">
                            {x.car_id !== null ? <span className="plate">{x.source}</span> : sourceLabel(x.source, t)}
                            {x.car && <span className="text-muted"> {x.car}</span>}
                          </p>
                          {cargoLine(x, t) && <p className="text-sm break-words">{cargoLine(x, t)}</p>}
                          {x.description && <p className="text-sm break-words">{x.description}</p>}
                          {x.customer_name && (
                            <p className="text-sm break-words">
                              {Number(x.owed) > 0 ? (
                                <span className="rounded bg-warn-soft px-1.5 py-px text-xs font-medium text-warn">
                                  {t("Deni", "Owed")} {formatMoney(x.owed)}
                                </span>
                              ) : (
                                <span className="rounded bg-ok-soft px-1.5 py-px text-xs font-medium text-ok">{t("Deni limelipwa", "Debt paid")}</span>
                              )}{" "}
                              {x.customer_name}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-muted">
                            {x.backfilled ? (
                              <>
                                {formatWallDate(x.recorded_at)} · <span className="font-medium text-warn">{t("Rekodi ya zamani", "Past record")}</span>
                              </>
                            ) : (
                              <>{t("Imerekodiwa", "Recorded")} {formatWallTime(x.recorded_at)}</>
                            )}
                            {x.recorded_by && ` · ${x.recorded_by}`}
                          </p>
                        </div>
                        <p className="shrink-0 font-medium text-ok tabular-nums">+{formatMoney(x.amount)}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </section>
      </main>
  );
}

const tones = {
  in: { card: "border-ok/25 bg-ok-soft", text: "text-ok", icon: "bg-ok text-white" },
  out: { card: "border-warn/25 bg-warn-soft", text: "text-warn", icon: "bg-warn text-white" },
  balance: { card: "border-info/25 bg-info-soft", text: "text-info", icon: "bg-info text-white" },
  negative: { card: "border-danger/25 bg-danger-soft", text: "text-danger", icon: "bg-danger text-white" },
};

// Money in is green, money out amber, and the balance blue, or red when it's below zero.
function Total({
  wide = false,
  tone,
  icon,
  label,
  value,
  note,
}: {
  wide?: boolean;
  tone: keyof typeof tones;
  icon: IconName;
  label: string;
  value: number;
  note: string;
}) {
  const look = tones[tone];
  return (
    <div className={`flex items-center gap-4 rounded-xl border p-4 sm:p-5 ${look.card} ${wide ? "col-span-2 sm:col-span-1" : ""}`}>
      <span className={`grid size-11 shrink-0 place-items-center rounded-full max-sm:hidden ${look.icon}`}>
        <Icon name={icon} className="size-5" />
      </span>
      <div className="min-w-0 flex-1 @container">
        <p className={`text-sm font-medium ${look.text}`}>{label}</p>
        <p className={`figure ${look.text}`}>{keepMinus(formatMoney(value))}</p>
        <p className="text-xs text-muted">{note}</p>
      </div>
    </div>
  );
}
