import { FuelOverview, parseFuelTab } from "@/components/fuel-overview";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { getFuelOverview, parseFuelPeriod, periodRange } from "@/lib/fuel";
import { formatKm } from "@/lib/format";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { requireUser } from "@/lib/session";
import { ReadingForm, TankForm } from "./fuel-forms";

export default async function ManagerFuelPage({ searchParams }: PageProps<"/manager/fuel">) {
  await requireUser("manager");
  const sp = await searchParams;
  const period = parseFuelPeriod(sp.kipindi);
  const data = await getFuelOverview(periodRange(period));
  const missingTanks = data.cars.filter((c) => !c.tank_litres).length;

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader
        title="Mafuta"
        description="Kila ombi la mafuta, dereva anaandika kilomita na geji. Kati ya vipimo viwili tunajua km zilizotembewa na lita zilizotumika."
      />

      <section className="card">
        <h2 className="text-lg font-semibold">Rekodi kipimo</h2>
        <p className="mb-4 text-sm text-muted">
          Kipimo cha kwanza kinaanza ufuatiliaji wa gari, na gari halitaombewa mafuta kabla yake. Gari likibadilisha
          dereva, mpe dereva mpya gari kwanza, kisha rekodi kipimo hapa.
        </p>
        <ReadingForm
          preselect={Number(sp.gari) || undefined}
          cars={data.cars.map((c) => ({
            id: c.id,
            plate: c.plate,
            car: c.car,
            driver: c.driver,
            last: c.last ? formatKm(c.last.odometer) : null,
          }))}
        />
      </section>

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
