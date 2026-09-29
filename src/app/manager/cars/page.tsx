import { assignDriver } from "@/app/actions/cars";
import { Header } from "@/components/header";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { managerLinks } from "../nav";
import { CarForm } from "./car-form";

type CarRow = { id: number; plate: string; make: string; model: string; driver_id: number | null };

export default async function CarsPage() {
  const user = await requireUser("manager");
  const [cars, drivers] = await Promise.all([
    query<CarRow>("SELECT id, plate, make, model, driver_id FROM cars ORDER BY plate"),
    query<{ id: number; name: string }>("SELECT id, name FROM users WHERE role = 'driver' ORDER BY name"),
  ]);

  return (
    <>
      <Header user={user} links={managerLinks} />
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
        <section className="card">
          <h2 className="mb-4 text-lg font-semibold">Add a car</h2>
          <CarForm />
        </section>

        <section className="card">
          <h2 className="mb-4 text-lg font-semibold">
            Cars <span className="text-muted">({cars.length})</span>
          </h2>
          {cars.length === 0 ? (
            <p className="text-sm text-muted">No cars yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {cars.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {c.make} {c.model}
                    </p>
                    <p className="font-mono text-sm text-muted">{c.plate}</p>
                  </div>
                  {/* key forces the select to pick up a new default after reassignment */}
                  <form action={assignDriver} key={c.driver_id ?? "none"} className="flex gap-2">
                    <input type="hidden" name="carId" value={c.id} />
                    <select
                      name="driverId"
                      defaultValue={c.driver_id ?? ""}
                      aria-label={`Driver for ${c.plate}`}
                      className="input w-44"
                    >
                      <option value="">No driver</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn btn-ghost">
                      Save
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
