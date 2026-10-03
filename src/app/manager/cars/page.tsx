import Link from "next/link";
import { assignDriver } from "@/app/actions/cars";
import { PageHeader } from "@/components/page-header";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { AddCar } from "./car-form";

type CarRow = { id: number; plate: string; make: string; model: string; driver_id: number | null; measured: boolean };

export default async function CarsPage() {
  await requireUser("manager");
  const [cars, drivers] = await Promise.all([
    query<CarRow>(
      `SELECT id, plate, make, model, driver_id,
              EXISTS (SELECT 1 FROM fuel_readings r WHERE r.car_id = cars.id) AS measured
         FROM cars ORDER BY plate`,
    ),
    query<{ id: number; name: string }>("SELECT id, name FROM users WHERE role = 'driver' ORDER BY name"),
  ]);
  const free = cars.filter((c) => c.driver_id === null).length;
  const unmeasured = cars.filter((c) => !c.measured).length;

  return (
    <main className="page">
      <PageHeader
        title="Magari"
        description={`Magari ${cars.length}${free ? ` · ${free} hayana dereva` : ""}${unmeasured ? ` · ${unmeasured} bado hayajapimwa mafuta` : ""}. Namba ya gari ndiyo dereva anaitumia kuingia.`}
        action={<AddCar />}
      />

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">
          Magari yote <span className="text-muted">({cars.length})</span>
        </h2>
        {cars.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Bado hakuna gari. Bonyeza Ongeza gari hapo juu.</p>
        ) : (
          <ul className="divide-y divide-line">
            {cars.map((c) => (
              <li key={c.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <p className="flex min-w-0 flex-wrap items-center gap-2 font-medium">
                  <span className="plate">{c.plate}</span>
                  {c.make} {c.model}
                  {c.driver_id === null && <span className="text-xs font-normal text-warn">Hana dereva</span>}
                  {/* No fuel can be asked for a car until its starting reading is in. */}
                  {!c.measured && (
                    <Link href={`/manager/fuel?gari=${c.id}`} className="text-xs font-normal text-warn underline">
                      Bado halijapimwa mafuta: rekodi kipimo
                    </Link>
                  )}
                </p>
                {/* key forces the select to pick up a new default after reassignment */}
                <form action={assignDriver} key={c.driver_id ?? "none"} className="flex gap-2">
                  <input type="hidden" name="carId" value={c.id} />
                  <select
                    name="driverId"
                    defaultValue={c.driver_id ?? ""}
                    aria-label={`Dereva wa ${c.plate}`}
                    className="input min-w-0 flex-1 sm:w-52 sm:flex-none"
                  >
                    <option value="">Hakuna dereva</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="btn btn-ghost shrink-0">
                    Hifadhi
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
