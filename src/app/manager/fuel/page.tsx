import { getT } from "@/lib/lang";
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
  const t = await getT();
  const sp = await searchParams;
  const period = parseFuelPeriod(sp.kipindi);
  const data = await getFuelOverview(periodRange(period));
  const missingTanks = data.cars.filter((c) => !c.tank_litres).length;

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader
        title={t("Mafuta", "Fuel")}
        description={t(
          "Kila ombi la mafuta, dereva anaandika kilomita na geji. Kati ya vipimo viwili tunajua km zilizotembewa na lita zilizotumika.",
          "With every fuel request the driver writes the kilometres and the gauge. Between two readings we know the km driven and the litres used.",
        )}
      />

      <section className="card">
        <h2 className="text-lg font-semibold">{t("Rekodi kipimo", "Record a reading")}</h2>
        <p className="mb-4 text-sm text-muted">
          {t(
            "Kipimo cha kwanza kinaanza ufuatiliaji wa gari, na gari halitaombewa mafuta kabla yake. Gari likibadilisha dereva, mpe dereva mpya gari kwanza, kisha rekodi kipimo hapa.",
            "The first reading starts tracking a car, and no fuel can be asked for it before then. When a car changes driver, give the new driver the car first, then record a reading here.",
          )}
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
          {t("Matanki ya magari", "Car tanks")}
          {missingTanks > 0 && <span className="ml-2 text-sm font-normal text-warn">{t(`${missingTanks} hayajawekwa`, `${missingTanks} not set`)}</span>}
        </summary>
        <p className="mt-1 mb-3 text-sm text-muted">{t("Ukubwa wa tanki unageuza geji kuwa lita.", "The tank size turns the gauge into litres.")}</p>
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
