import { Icon } from "@/components/icons";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { query } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import { driverChannel } from "@/lib/realtime";
import { listRequestsForDriver } from "@/lib/requests";
import { requireUser } from "@/lib/session";
import { RequestForm } from "./request-form";

export default async function DriverPage() {
  const user = await requireUser("driver");
  const [cars, requests] = await Promise.all([
    query<{ plate: string; make: string; model: string }>(
      "SELECT plate, make, model FROM cars WHERE driver_id = $1",
      [user.id],
    ),
    listRequestsForDriver(user.id),
  ]);
  const car = cars[0];
  const pending = requests.filter((r) => r.status === "pending").length;

  return (
    <main className="page">
      <LiveUpdates channel={driverChannel(user.id)} />
      <PageHeader title={`Habari, ${user.name.split(" ")[0]}`} description="Omba pesa na ufuatilie majibu ya meneja hapa." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <div className="grid gap-6">
          <section className="card flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
              <Icon name="car" className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-muted uppercase">Gari lako</p>
              {car ? (
                <p className="mt-0.5 flex flex-wrap items-center gap-2 font-semibold">
                  <span className="plate">{car.plate}</span>
                  {car.make} {car.model}
                </p>
              ) : (
                <p className="mt-0.5 font-semibold">Bado hujapewa gari</p>
              )}
            </div>
          </section>

          <section className="card">
            <h2 className="mb-4 text-lg font-semibold">Omba pesa</h2>
            <RequestForm />
          </section>
        </div>

        <section className="card">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">Maombi yangu</h2>
            {pending > 0 && <span className="text-sm text-warn">{pending} yanasubiri</span>}
          </div>
          {requests.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Bado hujatuma ombi lolote.</p>
          ) : (
            <ul className="divide-y divide-line">
              {requests.map((r) => (
                <li key={r.id} className="flex items-start gap-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold tabular-nums">{formatMoney(r.amount)}</p>
                    <p className="text-sm break-words">{r.reason}</p>
                    <p className="mt-1 text-xs text-muted">
                      Imetumwa {formatDateTime(r.created_at)}
                      {r.reviewed_at &&
                        ` · ${r.status === "approved" ? "Imekubaliwa" : "Imekataliwa"} na ${r.reviewer_name ?? "meneja"} ${formatDateTime(r.reviewed_at)}`}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
