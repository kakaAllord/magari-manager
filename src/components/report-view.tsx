import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { formatMoney, formatWallTime } from "@/lib/format";
import { formatDay, parseReportParams, presets, toSearch, type Grouping } from "@/lib/report-params";
import { getExpenses, getIncomes, listCars, summarise, summariseIncome, todayInTanzania } from "@/lib/reports";

const groupings: { value: Grouping; label: string }[] = [
  { value: "car", label: "Kwa gari" },
  { value: "month", label: "Kwa mwezi" },
  { value: "week", label: "Kwa wiki" },
];

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

  return (
      <main className="page">
        <PageHeader
          title="Ripoti"
          description="Mapato na matumizi kwa kipindi unachochagua. Matumizi ni pesa zilizotolewa na mhasibu, kwa tarehe ya kutolewa; mapato ni kwa tarehe ya kurekodiwa."
        />

        <form className="card grid gap-5" method="get">
          <fieldset className="grid gap-2">
            <legend className="label">Kipindi</legend>
            <div className="flex flex-wrap gap-2">
              {presets(today).map((p) => {
                const active = p.from === params.from && p.to === params.to;
                return (
                  <Link
                    key={p.label}
                    href={`?${toSearch({ ...params, from: p.from, to: p.to })}`}
                    className={`chip ${active ? "chip-on" : ""}`}
                    aria-current={active ? "true" : undefined}
                  >
                    {p.label}
                  </Link>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:max-w-md">
              <label>
                <span className="mb-1 block text-xs text-muted">Kuanzia</span>
                <input type="date" name="from" defaultValue={params.from} max={today} className="input" />
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted">Hadi</span>
                <input type="date" name="to" defaultValue={params.to} max={today} className="input" />
              </label>
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="label">Magari</legend>
            <div className="flex flex-wrap gap-2">
              {cars.map((c) => (
                <label key={c.id} className="chip has-checked:chip-on cursor-pointer">
                  <input
                    type="checkbox"
                    name="cars"
                    value={c.id}
                    defaultChecked={params.carIds.includes(c.id)}
                    className="size-4 accent-accent"
                  />
                  <span className="font-mono text-xs">{c.plate}</span>
                  <span className="text-muted">{c.car}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted">
              Usipochagua gari lolote, magari yote yanajumuishwa. Ukichagua magari, mapato na matumizi ni ya magari hayo tu; mapato ya zamani yasiyo na gari yanaonekana ukiwa na magari yote.
            </p>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="label">Panga</legend>
            <div className="inline-flex w-full rounded-lg border border-line p-1 sm:w-auto">
              {groupings.map((g) => (
                <label
                  key={g.value}
                  className="flex-1 cursor-pointer rounded-md px-4 py-2 text-center text-sm text-muted has-checked:bg-accent-soft has-checked:font-medium has-checked:text-accent sm:flex-none"
                >
                  <input type="radio" name="group" value={g.value} defaultChecked={params.group === g.value} className="sr-only" />
                  {g.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <button type="submit" className="btn btn-primary w-full sm:w-auto">
              Onyesha ripoti
            </button>
          </div>
        </form>

        <section className="card grid gap-4" aria-label="Jumla">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="text-sm text-muted">
              {formatDay(params.from)} hadi {formatDay(params.to)}
            </p>
            <a href={`${base}/export?${search}`} className="btn btn-primary w-full gap-2 sm:w-auto" download>
              <Icon name="download" className="size-4" />
              Pakua Excel
            </a>
          </div>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium tracking-wide text-muted uppercase">Mapato</dt>
              <dd className="text-xl font-semibold text-ok tabular-nums sm:text-2xl">{formatMoney(income.total)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-muted uppercase">Matumizi</dt>
              <dd className="text-xl font-semibold tabular-nums sm:text-2xl">{formatMoney(summary.grandTotal)}</dd>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-xs font-medium tracking-wide text-muted uppercase">Salio</dt>
              <dd className={`text-xl font-semibold tabular-nums sm:text-2xl ${balance < 0 ? "text-danger" : "text-ok"}`}>
                {formatMoney(balance)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="card grid gap-4">
          <div>
            <h2 className="text-lg font-semibold">Matumizi</h2>
            <p className="text-sm text-muted">
              Maombi {summary.count} ·{" "}
              {params.carIds.length ? `magari ${params.carIds.length} yaliyochaguliwa` : `magari yote (${cars.length})`}
            </p>
          </div>

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
            <details open>
              <summary className="cursor-pointer text-sm font-medium">Kila ombi na tarehe yake ({expenses.length})</summary>
              <ul className="mt-2 divide-y divide-line">
                {expenses.map((e, i) => (
                  <li key={i} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="break-words">
                        <span className="plate">{e.plate ?? "Hakuna gari"}</span> {e.reason}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Imetolewa {formatWallTime(e.issued_at)}
                        {e.issued_by && ` na ${e.issued_by}`} · imekubaliwa {formatWallTime(e.approved_at)} · iliombwa{" "}
                        {formatWallTime(e.requested_at)} · {e.requester}
                        {e.issue_note && ` · ${e.issue_note}`}
                      </p>
                    </div>
                    <p className="shrink-0 font-medium tabular-nums">{formatMoney(e.amount)}</p>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <section className="card grid gap-4">
          <div>
            <h2 className="text-lg font-semibold">Mapato</h2>
            <p className="text-sm text-muted">
              {income.count === 1 ? "Rekodi 1" : `Rekodi ${income.count}`} ·{" "}
              {params.group === "car" ? "kwa chanzo" : params.group === "month" ? "kwa mwezi" : "kwa wiki"}
            </p>
          </div>
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
            <details open>
              <summary className="cursor-pointer text-sm font-medium">Kila rekodi na tarehe yake ({incomes.length})</summary>
              <ul className="mt-2 divide-y divide-line">
                {incomes.map((x, i) => (
                  <li key={i} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="break-words">
                        {x.car ? <span className="plate">{x.source}</span> : x.source}
                        {x.car && <span className="text-muted"> {x.car}</span>}
                      </p>
                      {x.description && <p className="text-sm break-words">{x.description}</p>}
                      <p className="mt-1 text-xs text-muted">
                        Imerekodiwa {formatWallTime(x.recorded_at)}
                        {x.recorded_by && ` · ${x.recorded_by}`}
                      </p>
                    </div>
                    <p className="shrink-0 font-medium text-ok tabular-nums">+{formatMoney(x.amount)}</p>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      </main>
  );
}
