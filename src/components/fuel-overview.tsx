import type { Tr } from "@/lib/i18n";
import { getT } from "@/lib/lang";
import Link from "next/link";
import { deleteLatestReading } from "@/app/actions/fuel";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { gaugeLabel, type Totals } from "@/lib/fuel-calc";
import { fuelPeriods, fuelTypeName, type FuelOverview as Overview, type FuelPeriod } from "@/lib/fuel";
import { formatDateTime, formatKm, formatLitres, formatMoney, formatRate } from "@/lib/format";

// Old links to the removed "vipindi" tab land on "Kwa gari".
export type FuelTab = "magari" | "madereva";
export const parseFuelTab = (v: unknown): FuelTab => (v === "madereva" ? v : "magari");

// The fuel picture, shared by managers (who can also delete a car's latest reading) and directors.
export async function FuelOverview({
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
  const t = await getT();
  const measured = data.cars.filter((c) => c.totals.stretches > 0).length;
  const href = (key: FuelTab) => `?${new URLSearchParams({ kipindi: period, ...(key === "magari" ? {} : { tab: key }) })}`;
  const tabs: { key: FuelTab; label: string }[] = [
    { key: "magari", label: t("Kwa gari", "By car") },
    { key: "madereva", label: t("Kwa dereva", "By driver") },
  ];

  return (
    <>
      <section className="grid gap-3">
        <form method="get" className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("Matumizi ya mafuta", "Fuel use")}</h2>
          {tab !== "magari" && <input type="hidden" name="tab" value={tab} />}
          <AutoSubmitSelect
            name="kipindi"
            defaultValue={period}
            options={fuelPeriods(t)}
            aria-label={t("Kipindi", "Period")}
            className="input w-auto"
          />
        </form>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Tile label={t("Km zilizotembewa", "Km driven")} value={formatKm(data.all.km)}>
            {measured === 1 ? t("Gari 1 limepimwa", "1 car measured") : t(`Magari ${measured} yamepimwa`, `${measured} cars measured`)}
          </Tile>
          <Tile label={t("Lita zilizotumika", "Litres used")} value={formatLitres(data.all.litres)}>
            {t("Gharama", "Cost")} {formatMoney(data.all.cost)}
          </Tile>
          <Tile wide label={t("Km kwa lita", "Km per litre")} value={formatRate(data.all.kmPerLitre)}>
            {data.all.costPerKm === null ? t("Bado haijapimwa", "Not measured yet") : `${formatMoney(data.all.costPerKm)} ${t("kwa km", "per km")}`}
          </Tile>
        </div>
      </section>

      <section className="card grid gap-4">
        <nav className="-mx-4 -mt-4 flex border-b border-line sm:-mx-5 sm:-mt-5" aria-label={t("Mafuta kwa", "Fuel by")}>
          {tabs.map((x) => (
            <Link
              key={x.key}
              href={href(x.key)}
              scroll={false}
              aria-current={tab === x.key ? "page" : undefined}
              className="flex flex-1 items-center justify-center gap-1.5 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted hover:text-foreground aria-[current=page]:border-accent aria-[current=page]:text-foreground"
            >
              {x.label}
            </Link>
          ))}
        </nav>

        {tab === "magari" && <CarsTable data={data} manage={manage} t={t} />}
        {tab === "madereva" && <DriversTable data={data} t={t} />}
      </section>
    </>
  );
}

function TotalsCells({ totals: x }: { totals: Totals }) {
  return (
    <>
      <td className="num">{x.stretches ? formatKm(x.km) : "–"}</td>
      <td className="num">{x.stretches ? formatLitres(x.litres) : "–"}</td>
      <td className="num font-medium">{formatRate(x.kmPerLitre)}</td>
      <td className="num">{x.costPerKm === null ? "–" : formatMoney(x.costPerKm)}</td>
    </>
  );
}

const TotalsHead = ({ t }: { t: Tr }) => (
  <>
    <th className="num">Km</th>
    <th className="num">{t("Lita", "Litres")}</th>
    <th className="num">Km/L</th>
    <th className="num">TSh/km</th>
  </>
);

function CarsTable({ data, manage, t }: { data: Overview; manage: boolean; t: Tr }) {
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>{t("Gari", "Car")}</th>
            <TotalsHead t={t} />
          </tr>
        </thead>
        <tbody>
          {data.cars.map((c) => (
            <tr key={c.id}>
              <td className="min-w-56">
                <p className="flex flex-wrap items-center gap-x-2">
                  <span className="plate">{c.plate}</span>
                  <span className="text-muted">{c.driver ?? t("Hana dereva", "No driver")}</span>
                </p>
                <p className="mt-1 text-xs text-muted">
                  {[
                    c.car,
                    c.fuel_type ? fuelTypeName(c.fuel_type, t) : t("aina ya mafuta haijawekwa", "fuel type not set"),
                    c.tank_litres && t(`tanki L ${c.tank_litres}`, `tank ${c.tank_litres} L`),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {!c.tank_litres && (
                  <p className="mt-1 text-xs font-medium text-warn">
                    {manage ? (
                      <a href="#matanki" className="underline">
                        {t("Weka ukubwa wa tanki ili kupima", "Set the tank size to measure")}
                      </a>
                    ) : (
                      t("Meneja hajaweka ukubwa wa tanki", "The manager hasn't set the tank size")
                    )}
                  </p>
                )}
                {c.last ? (
                  <div className="mt-1 text-xs text-muted">
                    {t("Mwisho", "Last")}: km {formatKm(c.last.odometer)} · {gaugeLabel(c.last.eighths, t)} · {formatDateTime(c.last.at)}
                    {c.last.by && ` · ${c.last.by}${c.last.byManager ? t(" (meneja)", " (manager)") : ""}`}
                    {c.litresSinceLast > 0 &&
                      t(` · lita ${formatLitres(c.litresSinceLast)} zimelipiwa tangu hapo`, ` · ${formatLitres(c.litresSinceLast)} litres paid for since then`)}
                    {manage && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-danger">{t("Futa kipimo hiki", "Delete this reading")}</summary>
                        <form action={deleteLatestReading} className="mt-1 flex items-center gap-2">
                          <input type="hidden" name="id" value={c.last.id} />
                          <span>{t("Kimekosewa? Kitafutwa kabisa.", "A mistake? It will be deleted for good.")}</span>
                          <button type="submit" className="btn btn-ghost text-danger">
                            {t("Ndiyo, futa", "Yes, delete")}
                          </button>
                        </form>
                      </details>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-muted">{t("Bado halijapimwa", "Not measured yet")}</p>
                )}
              </td>
              <TotalsCells totals={c.totals} />
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>{t("Jumla", "Total")}</td>
            <TotalsCells totals={data.all} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function DriversTable({ data, t }: { data: Overview; t: Tr }) {
  if (!data.drivers.length) return <Empty t={t} />;
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>{t("Dereva", "Driver")}</th>
            <TotalsHead t={t} />
          </tr>
        </thead>
        <tbody>
          {data.drivers.map((d) => (
            <tr key={d.id ?? "none"}>
              <td className="whitespace-nowrap">{d.name}</td>
              <TotalsCells totals={d.totals} />
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted">
        {t("Km na lita zinahesabiwa kwa dereva aliyekuwa na gari wakati huo.", "Km and litres count for whoever was driving the car at the time.")}
      </p>
    </div>
  );
}

const Empty = ({ t }: { t: Tr }) => (
  <p className="py-6 text-center text-sm text-muted">{t("Bado hakuna vipimo vya kutosha katika muda huu.", "Not enough readings in this time yet.")}</p>
);

function Tile({ label, value, wide = false, children }: { label: string; value: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={`card @container ${wide ? "col-span-2 lg:col-span-1" : ""}`}>
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className="figure mt-1">{value}</p>
      <p className="mt-1 text-xs text-muted">{children}</p>
    </div>
  );
}
