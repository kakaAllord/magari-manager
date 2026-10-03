import { FuelOverview, parseFuelTab } from "@/components/fuel-overview";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { getFuelOverview, parseFuelPeriod, periodRange } from "@/lib/fuel";
import { formatKm } from "@/lib/format";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { requireUser } from "@/lib/session";
import { PricesForm, ReadingForm, TankForm } from "./fuel-forms";

export default async function ManagerFuelPage({ searchParams }: PageProps<"/manager/fuel">) {
  await requireUser("manager");
  const sp = await searchParams;
  const period = parseFuelPeriod(sp.kipindi);
  const data = await getFuelOverview(periodRange(period));
  const missingTanks = data.cars.filter((c) => !c.tank_litres).length;
  const missingPrice = data.prices.petrol === null && data.prices.diesel === null;

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader
        title="Mafuta"
        description="Kila ombi la mafuta, dereva anaandika kilomita na geji. Kati ya vipimo viwili tunajua km zilizotembewa na lita zilizotumika."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <section className="card">
          <h2 className="text-lg font-semibold">Rekodi kipimo</h2>
          <p className="mb-4 text-sm text-muted">
            Kipimo cha kwanza kinaanza ufuatiliaji wa gari. Gari likibadilisha dereva, mpe dereva mpya gari kwanza,
            kisha rekodi kipimo hapa.
          </p>
          <ReadingForm
            cars={data.cars.map((c) => ({
              id: c.id,
              plate: c.plate,
              car: c.car,
              driver: c.driver,
              last: c.last ? formatKm(c.last.odometer) : null,
            }))}
          />
        </section>

        <section className={`card ${missingPrice ? "border-warn/50" : ""}`}>
          <h2 className="text-lg font-semibold">Bei ya lita moja</h2>
          <p className="mb-4 text-sm text-muted">
            Lita za kila ombi zinahesabiwa kwa bei ya siku lilipoombwa. Badilisha bei EWURA wanapotangaza mpya.
          </p>
          <PricesForm petrol={data.prices.petrol} diesel={data.prices.diesel} />
        </section>
      </div>

      <FuelOverview data={data} period={period} tab={parseFuelTab(sp.tab)} manage />

      <details id="matanki" className="card" open={missingTanks > 0}>
        <summary className="cursor-pointer text-lg font-semibold">
          Matanki ya magari
          {missingTanks > 0 && <span className="ml-2 text-sm font-normal text-warn">{missingTanks} hayajawekwa</span>}
        </summary>
        <p className="mt-1 mb-3 text-sm text-muted">Ukubwa wa tanki unageuza geji kuwa lita.</p>
        <ul className="divide-y divide-line">
          {data.cars.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <p className="flex items-center gap-2">
                <span className="plate">{c.plate}</span>
                <span className="text-sm text-muted">{c.car}</span>
              </p>
              <TankForm carId={c.id} fuelType={c.fuel_type} tank={c.tank_litres} />
            </li>
          ))}
        </ul>
      </details>
    </main>
  );
}
