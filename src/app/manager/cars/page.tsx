import { assignDriver } from "@/app/actions/cars";
import { PageHeader } from "@/components/page-header";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { missingForFuel } from "@/lib/fuel-ready";
import { AddCar, CarRow } from "./car-form";

type Car = {
  id: number;
  plate: string;
  name: string | null;
  fuel_type: "petrol" | "diesel" | null;
  tank_litres: number | null;
  driver_id: number | null;
  measured: boolean;
  used: boolean;
};

export default async function CarsPage() {
  await requireUser("manager");
  const [cars, drivers] = await Promise.all([
    query<Car>(
      `SELECT id, plate, name, fuel_type, tank_litres, driver_id,
              EXISTS (SELECT 1 FROM fuel_readings r WHERE r.car_id = cars.id) AS measured,
              EXISTS (SELECT 1 FROM money_requests m WHERE m.car_id = cars.id)
                OR EXISTS (SELECT 1 FROM incomes i WHERE i.car_id = cars.id) AS used
         FROM cars ORDER BY plate`,
    ),
    query<{ id: number; name: string }>("SELECT id, name FROM users WHERE role = 'driver' ORDER BY name"),
  ]);
  const free = cars.filter((c) => c.driver_id === null).length;
  const missing = new Map(
    cars.map((c) => [c.id, missingForFuel({ fuelType: c.fuel_type, tank: c.tank_litres, measured: c.measured })]),
  );
  const notReady = cars.filter((c) => missing.get(c.id)).length;

  return (
    <main className="page">
      <PageHeader
        title="Magari"
        description={`Magari ${cars.length}${free ? ` · ${free} hayana dereva` : ""}${notReady ? ` · ${notReady} hayako tayari kwa mafuta` : ""}. Namba ya gari ndiyo dereva anaitumia kuingia.`}
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
              <CarRow
                key={c.id}
                car={{ id: c.id, plate: c.plate, name: c.name, fuelType: c.fuel_type, tank: c.tank_litres, measured: c.measured }}
                missing={missing.get(c.id) ?? ""}
                driverless={c.driver_id === null}
                used={c.used}
              >
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
              </CarRow>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
