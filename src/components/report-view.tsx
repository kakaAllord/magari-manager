import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { ReportToolbar } from "@/components/report-filters";
import { formatMoney, formatWallDate, formatWallTime } from "@/lib/format";
import { parseReportParams, presets, toSearch } from "@/lib/report-params";
import { getExpenses, getIncomes, listCars, summarise, summariseIncome, todayInTanzania } from "@/lib/reports";

// The reports page, shared by managers and directors. `base` is the page's own path.
export async function ReportView({
  base,
  searchParams,
}: {
  base: "/manager/reports" | "/director/reports" | "/accountant/reports";
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const today = todayInTanzania();
  const params = parseReportParams(searchParams, today);
  const [cars, expenses, incomes] = await Promise.all([listCars(), getExpenses(params), getIncomes(params)]);
  const summary = summarise(expenses, cars, params);
  const income = summariseIncome(incomes, params);
  const balance = income.total - summary.grandTotal;
  const search = toSearch(params);
  // Spending and income share one card; the tab lives in the URL so filtering keeps it.
  const tab = searchParams.tab === "mapato" ? "mapato" : "matumizi";
  const tabSearch = (t: string) => (t === "mapato" ? `${search}&tab=mapato` : search);

  return (
      <main className="page">
        <PageHeader
          title="Ripoti"
          description="Mapato na matumizi kwa kipindi unachochagua. Matumizi ni pesa zilizotolewa na mhasibu, kwa tarehe ya kutolewa; mapato ni kwa tarehe ya kurekodiwa."
        />

        <ReportToolbar
          presets={presets(today)}
          params={params}
          cars={cars}
          today={today}
          tab={tab}
          downloads={[
            { label: "PDF", hint: "Tayari kuchapisha au kutuma", href: `${base}/export?${search}&format=pdf`, icon: "pdf" },
            { label: "Excel", hint: "Fomula, chati na majedwali ya kuchuja", href: `${base}/export?${search}`, icon: "sheet" },
          ]}
        />

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Jumla">
          <Total
            tone="in"
            icon="moneyIn"
            label="Mapato"
            value={income.total}
            note={income.count === 1 ? "Rekodi 1" : `Rekodi ${income.count}`}
          />
          <Total
            tone="out"
            icon="moneyOut"
            label="Matumizi"
            value={summary.grandTotal}
            note={summary.count === 1 ? "Ombi 1 lililolipwa" : `Maombi ${summary.count} yaliyolipwa`}
          />
          <Total
            wide
            tone={balance < 0 ? "negative" : "balance"}
            icon="wallet"
            label="Salio"
            value={balance}
            note={balance < 0 ? "Matumizi yamezidi mapato" : "Mapato toa matumizi"}
          />
        </section>

        <section className="card grid gap-4">
          <nav className="-mx-4 -mt-4 flex border-b border-line sm:-mx-5 sm:-mt-5" aria-label="Matumizi au mapato">
            {(
              [
                { key: "matumizi", label: "Matumizi", count: summary.count },
                { key: "mapato", label: "Mapato", count: income.count },
              ] as const
            ).map((t) => (
              <Link
                key={t.key}
                href={`?${tabSearch(t.key)}`}
                scroll={false}
                aria-current={tab === t.key ? "page" : undefined}
                className="flex flex-1 items-center justify-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted hover:text-foreground aria-[current=page]:border-accent aria-[current=page]:text-foreground"
              >
                {t.label}
                <span className="rounded-full bg-background px-2 text-xs tabular-nums">{t.count}</span>
              </Link>
            ))}
          </nav>

          {tab === "matumizi" ? (
            <>
              <p className="text-sm text-muted">
                Maombi {summary.count} ·{" "}
                {params.carIds.length ? `magari ${params.carIds.length} yaliyochaguliwa` : `magari yote (${cars.length})`}
              </p>

              {params.group === "car" ? (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Gari</th>
                        <th className="num">Maombi</th>
                        <th className="num">Jumla</th>
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
                        <td>Jumla</td>
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
                        <th>{params.group === "month" ? "Mwezi" : "Wiki"}</th>
                        {summary.columns.map((c) => (
                          <th key={c.key} className="num">
                            {c.label}
                          </th>
                        ))}
                        <th className="num">Jumla</th>
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
                        <td>Jumla</td>
                        {summary.totals.map((t, i) => (
                          <td key={summary.columns[i].key} className="num">
                            {formatMoney(t)}
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
                  <summary className="cursor-pointer text-sm font-medium">Kila ombi na tarehe yake ({expenses.length})</summary>
                  <ul className="mt-2 divide-y divide-line">
                    {expenses.map((e, i) => (
                      <li key={i} className="flex items-start justify-between gap-4 py-3">
                        <div className="min-w-0">
                          <p className="break-words">
                            <span className="plate">{e.plate ?? "Hakuna gari"}</span> {e.reason}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {e.backfilled ? (
                              <>
                                {formatWallDate(e.issued_at)} · <span className="font-medium text-warn">Rekodi ya zamani</span> ·{" "}
                                {e.requester}
                              </>
                            ) : (
                              <>
                                Imetolewa {formatWallTime(e.issued_at)}
                                {e.issued_by && ` na ${e.issued_by}`} · imekubaliwa {formatWallTime(e.approved_at)} · iliombwa{" "}
                                {formatWallTime(e.requested_at)} · {e.requester}
                                {e.issue_note && ` · ${e.issue_note}`}
                              </>
                            )}
                          </p>
                        </div>
                        <p className="shrink-0 font-medium tabular-nums">{formatMoney(e.amount)}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-muted">
                {income.count === 1 ? "Rekodi 1" : `Rekodi ${income.count}`} ·{" "}
                {params.group === "car" ? "kwa chanzo" : params.group === "month" ? "kwa mwezi" : "kwa wiki"}
              </p>
              {income.rows.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">Hakuna mapato katika kipindi hiki.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{params.group === "car" ? "Chanzo" : params.group === "month" ? "Mwezi" : "Wiki"}</th>
                        <th className="num">Mara</th>
                        <th className="num">Jumla</th>
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
                        <td>Jumla</td>
                        <td className="num">{income.count}</td>
                        <td className="num text-ok">{formatMoney(income.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {incomes.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-sm font-medium">Kila rekodi na tarehe yake ({incomes.length})</summary>
                  <ul className="mt-2 divide-y divide-line">
                    {incomes.map((x, i) => (
                      <li key={i} className="flex items-start justify-between gap-4 py-3">
                        <div className="min-w-0">
                          <p className="break-words">
                            {x.car_id !== null ? <span className="plate">{x.source}</span> : x.source}
                            {x.car && <span className="text-muted"> {x.car}</span>}
                          </p>
                          {x.description && <p className="text-sm break-words">{x.description}</p>}
                          <p className="mt-1 text-xs text-muted">
                            {x.backfilled ? (
                              <>
                                {formatWallDate(x.recorded_at)} · <span className="font-medium text-warn">Rekodi ya zamani</span>
                              </>
                            ) : (
                              <>Imerekodiwa {formatWallTime(x.recorded_at)}</>
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
  const t = tones[tone];
  return (
    <div className={`flex items-center gap-4 rounded-xl border p-4 sm:p-5 ${t.card} ${wide ? "col-span-2 sm:col-span-1" : ""}`}>
      <span className={`grid size-11 shrink-0 place-items-center rounded-full max-sm:hidden ${t.icon}`}>
        <Icon name={icon} className="size-5" />
      </span>
      <div className="min-w-0">
        <p className={`text-sm font-medium ${t.text}`}>{label}</p>
        <p className={`truncate text-lg font-semibold tabular-nums sm:text-2xl ${t.text}`}>{formatMoney(value)}</p>
        <p className="text-xs text-muted">{note}</p>
      </div>
    </div>
  );
}
