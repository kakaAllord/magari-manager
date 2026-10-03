import Link from "next/link";
import { deleteLatestReading } from "@/app/actions/fuel";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { flagText, gaugeLabel, type Totals } from "@/lib/fuel-calc";
import { fuelPeriods, fuelTypeName, type FuelOverview as Overview, type FuelPeriod } from "@/lib/fuel";
import { formatDateTime, formatKm, formatLitres, formatMoney, formatRate } from "@/lib/format";

export type FuelTab = "magari" | "madereva" | "vipindi";
export const parseFuelTab = (v: unknown): FuelTab => (v === "madereva" || v === "vipindi" ? v : "magari");


const dayFormat = new Intl.DateTimeFormat("sw-TZ", { day: "numeric", month: "short", timeZone: "Africa/Dar_es_Salaam" });

// The fuel picture, shared by managers (who can also delete a car's latest reading) and directors.
export function FuelOverview({
  data,
  period,
  tab,
  manage = false,
}: {
  data: Overview;
  period: FuelPeriod;
  tab: FuelTab;
  manage?: boolean;
}) {
  const flagged = data.stretches.filter((s) => s.flag).length;
  const href = (t: FuelTab) => `?${new URLSearchParams({ kipindi: period, ...(t === "magari" ? {} : { tab: t }) })}`;
  const tabs: { key: FuelTab; label: string; count?: number }[] = [
    { key: "magari", label: "Kwa gari" },
    { key: "madereva", label: "Kwa dereva" },
    { key: "vipindi", label: "Vipindi", count: flagged },
  ];

  return (
    <>
      <section className="grid gap-3">
        <form method="get" className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Matumizi ya mafuta</h2>
          {tab !== "magari" && <input type="hidden" name="tab" value={tab} />}
          <AutoSubmitSelect
            name="kipindi"
            defaultValue={period}
            options={fuelPeriods}
            aria-label="Kipindi"
            className="input w-auto"
          />
        </form>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Km zilizotembewa" value={formatKm(data.all.km)}>
            Vipindi {data.all.stretches} vilivyopimwa
          </Tile>
          <Tile label="Lita zilizotumika" value={formatLitres(data.all.litres)}>
            Gharama {formatMoney(data.all.cost)}
          </Tile>
          <Tile label="Km kwa lita" value={formatRate(data.all.kmPerLitre)}>
            {data.all.costPerKm === null ? "Bado haijapimwa" : `${formatMoney(data.all.costPerKm)} kwa km`}
          </Tile>
          <Tile label="Tahadhari" value={String(flagged)} tone={flagged ? "warn" : undefined}>
            {flagged ? (
              <Link href={href("vipindi")} className="underline">
                Ona vipindi vyenye tahadhari
              </Link>
            ) : (
              "Hakuna kipindi cha kutiliwa shaka"
            )}
          </Tile>
        </div>
      </section>

      <section className="card grid gap-4">
        <nav className="-mx-4 -mt-4 flex border-b border-line sm:-mx-5 sm:-mt-5" aria-label="Mafuta kwa">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={href(t.key)}
              scroll={false}
              aria-current={tab === t.key ? "page" : undefined}
              className="flex flex-1 items-center justify-center gap-1.5 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted hover:text-foreground aria-[current=page]:border-accent aria-[current=page]:text-foreground"
            >
              {t.label}
              {!!t.count && (
                <span className="rounded-full bg-warn-soft px-1.5 text-xs font-semibold text-warn">{t.count}</span>
              )}
            </Link>
          ))}
        </nav>

        {tab === "magari" && <CarsTable data={data} manage={manage} />}
        {tab === "madereva" && <DriversTable data={data} />}
        {tab === "vipindi" && <StretchList data={data} />}
      </section>
    </>
  );
}

function TotalsCells({ t }: { t: Totals }) {
  return (
    <>
      <td className="num">{t.stretches ? formatKm(t.km) : "–"}</td>
      <td className="num">{t.stretches ? formatLitres(t.litres) : "–"}</td>
      <td className="num font-medium">{formatRate(t.kmPerLitre)}</td>
      <td className="num">{t.costPerKm === null ? "–" : formatMoney(t.costPerKm)}</td>
      <td className="num">
        {t.flagged ? <span className="font-semibold text-warn">{t.flagged}</span> : <span className="text-muted">0</span>}
      </td>
    </>
  );
}

const TotalsHead = () => (
  <>
    <th className="num">Km</th>
    <th className="num">Lita</th>
    <th className="num">Km/L</th>
    <th className="num">TSh/km</th>
    <th className="num" title="Vipindi vyenye tahadhari">
      ⚠
    </th>
  </>
);

function CarsTable({ data, manage }: { data: Overview; manage: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Gari</th>
            <TotalsHead />
          </tr>
        </thead>
        <tbody>
          {data.cars.map((c) => (
            <tr key={c.id}>
              <td className="min-w-56">
                <p className="flex flex-wrap items-center gap-x-2">
                  <span className="plate">{c.plate}</span>
                  <span className="text-muted">{c.driver ?? "Hana dereva"}</span>
                </p>
                <p className="mt-1 text-xs text-muted">
                  {[c.car, c.fuel_type ? fuelTypeName[c.fuel_type] : "aina ya mafuta haijawekwa", c.tank_litres && `tanki L ${c.tank_litres}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {!c.tank_litres && (
                  <p className="mt-1 text-xs font-medium text-warn">
                    {manage ? (
                      <a href="#matanki" className="underline">
                        Weka ukubwa wa tanki ili kupima
                      </a>
                    ) : (
                      "Meneja hajaweka ukubwa wa tanki"
                    )}
                  </p>
                )}
                {c.last ? (
                  <div className="mt-1 text-xs text-muted">
                    Mwisho: km {formatKm(c.last.odometer)} · {gaugeLabel(c.last.eighths)} · {formatDateTime(c.last.at)}
                    {c.last.by && ` · ${c.last.by}${c.last.byManager ? " (meneja)" : ""}`}
                    {c.litresSinceLast > 0 && ` · lita ${formatLitres(c.litresSinceLast)} zimelipiwa tangu hapo`}
                    {manage && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-danger">Futa kipimo hiki</summary>
                        <form action={deleteLatestReading} className="mt-1 flex items-center gap-2">
                          <input type="hidden" name="id" value={c.last.id} />
                          <span>Kimekosewa? Kitafutwa kabisa.</span>
                          <button type="submit" className="btn btn-ghost text-danger">
                            Ndiyo, futa
                          </button>
                        </form>
                      </details>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-muted">Bado halijapimwa</p>
                )}
              </td>
              <TotalsCells t={c.totals} />
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Jumla</td>
            <TotalsCells t={data.all} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function DriversTable({ data }: { data: Overview }) {
  if (!data.drivers.length) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Dereva</th>
            <TotalsHead />
          </tr>
        </thead>
        <tbody>
          {data.drivers.map((d) => (
            <tr key={d.id ?? "none"}>
              <td className="whitespace-nowrap">{d.name}</td>
              <TotalsCells t={d.totals} />
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted">
        Kila kipindi ni cha dereva aliyekuwa na gari kuanzia kipimo cha kwanza cha kipindi hicho.
      </p>
    </div>
  );
}

function StretchList({ data }: { data: Overview }) {
  if (!data.stretches.length) return <Empty />;
  return (
    <ul className="divide-y divide-line">
      {data.stretches.map((s) => (
        <li key={`${s.from.id}-${s.to.id}`} className={`flex items-start gap-4 py-3 ${s.flag ? "-mx-2 rounded-lg bg-warn-soft px-2" : ""}`}>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-2">
              <span className="plate">{s.plate}</span>
              <span className="font-medium">{s.driver}</span>
              <span className="text-xs text-muted">
                {dayFormat.format(s.from.at)} → {dayFormat.format(s.to.at)}
              </span>
            </p>
            <p className="mt-1 text-sm tabular-nums">
              km {formatKm(s.km)} · lita {formatLitres(s.litresUsed)}
              {s.litresAdded > 0 && <span className="text-muted"> · +{formatLitres(s.litresAdded)} zilinunuliwa</span>}
            </p>
            {s.flag && <p className="mt-1 text-xs font-medium text-warn">{flagText[s.flag].long}</p>}
          </div>
          <div className="shrink-0 text-right">
            <p className={`font-semibold tabular-nums ${s.flag ? "text-warn" : ""}`}>{formatRate(s.kmPerLitre)}</p>
            <p className="text-xs text-muted">km/L</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

const Empty = () => (
  <p className="py-6 text-center text-sm text-muted">Bado hakuna kipindi kilichopimwa katika muda huu.</p>
);

function Tile({
  label,
  value,
  tone,
  children,
}: {
  label: string;
  value: string;
  tone?: "warn";
  children: React.ReactNode;
}) {
  return (
    <div className={`card ${tone === "warn" ? "border-warn/50 bg-warn-soft" : ""}`}>
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums sm:text-2xl ${tone === "warn" ? "text-warn" : ""}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{children}</p>
    </div>
  );
}
