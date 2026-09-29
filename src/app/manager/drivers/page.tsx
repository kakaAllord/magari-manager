import { Header } from "@/components/header";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { managerLinks } from "../nav";
import { AddDriverForm, SetPasswordForm } from "./driver-forms";

type DriverRow = { id: number; name: string; plate: string | null; car: string | null };

export default async function DriversPage() {
  const user = await requireUser("manager");
  const [drivers, freeCars] = await Promise.all([
    query<DriverRow>(
      `SELECT u.id, u.name, c.plate, c.make || ' ' || c.model AS car
         FROM users u LEFT JOIN cars c ON c.driver_id = u.id
        WHERE u.role = 'driver' ORDER BY u.name`,
    ),
    query<{ id: number; label: string }>(
      "SELECT id, plate || ' · ' || make || ' ' || model AS label FROM cars WHERE driver_id IS NULL ORDER BY plate",
    ),
  ]);

  return (
    <>
      <Header user={user} links={managerLinks} />
      <main className="page">
        <section className="card">
          <h2 className="mb-1 text-lg font-semibold">Add a driver</h2>
          <p className="mb-4 text-sm text-muted">
            Drivers sign in with their car&apos;s plate number and the password you set here.
          </p>
          <AddDriverForm freeCars={freeCars} />
        </section>

        <section className="card">
          <h2 className="mb-4 text-lg font-semibold">
            Drivers <span className="text-muted">({drivers.length})</span>
          </h2>
          {drivers.length === 0 ? (
            <p className="text-sm text-muted">No drivers yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {drivers.map((d) => (
                <li key={d.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_minmax(0,20rem)] sm:items-start">
                  <div className="min-w-0">
                    <p className="font-medium">{d.name}</p>
                    {d.plate ? (
                      <p className="text-sm text-muted">
                        Signs in with <span className="plate">{d.plate}</span> · {d.car}
                      </p>
                    ) : (
                      <p className="text-sm text-warn">No car, so they can&apos;t sign in yet</p>
                    )}
                  </div>
                  <SetPasswordForm driverId={d.id} driverName={d.name} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
