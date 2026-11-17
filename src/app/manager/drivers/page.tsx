import { getT } from "@/lib/lang";
import { PageHeader } from "@/components/page-header";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { AddDriverForm, DriverMenu } from "./driver-forms";

type DriverRow = { id: number; name: string; plate: string | null; car: string | null };

export default async function DriversPage() {
  await requireUser("manager");
  const t = await getT();
  const [drivers, freeCars] = await Promise.all([
    query<DriverRow>(
      `SELECT u.id, u.name, c.plate, c.name AS car
         FROM users u LEFT JOIN cars c ON c.driver_id = u.id
        WHERE u.role = 'driver' ORDER BY u.name`,
    ),
    query<{ id: number; label: string }>(
      "SELECT id, concat_ws(' · ', plate, name) AS label FROM cars WHERE driver_id IS NULL ORDER BY plate",
    ),
  ]);

  return (
    <main className="page">
      <PageHeader
        title={t("Madereva", "Drivers")}
        description={t("Dereva anaingia kwa namba ya gari lake na nenosiri unaloweka hapa.", "A driver signs in with their car's plate and the password you set here.")}
      />

      <section className="card">
        <h2 className="mb-4 text-lg font-semibold">{t("Ongeza dereva", "Add driver")}</h2>
        <AddDriverForm freeCars={freeCars} />
      </section>

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">
          {t("Madereva wote", "All drivers")} <span className="text-muted">({drivers.length})</span>
        </h2>
        {drivers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{t("Bado hakuna dereva. Ongeza wa kwanza hapo juu.", "No drivers yet. Add the first one above.")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {drivers.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-3.5">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                    {d.name
                      .split(/\s+/)
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">{d.name}</p>
                    {d.plate ? (
                      <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
                        {t("Anaingia kwa", "Signs in with")} <span className="plate">{d.plate}</span> {d.car}
                      </p>
                    ) : (
                      <p className="text-sm text-warn">{t("Hana gari, kwa hiyo hawezi kuingia bado", "No car, so they can't sign in yet")}</p>
                    )}
                  </div>
                </div>
                <DriverMenu driverId={d.id} driverName={d.name} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
