import Link from "next/link";
import { createRequest } from "@/app/actions/requests";
import { Icon } from "@/components/icons";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { RequestForm } from "@/components/request-form";
import { RequestSummary } from "@/components/request-item";
import { StatusBadge } from "@/components/status-badge";
import { query } from "@/lib/db";
import { getDriverFuelContext } from "@/lib/fuel";
import { driverChannel } from "@/lib/realtime";
import { listOpenForRequester } from "@/lib/requests";
import { requireUser } from "@/lib/session";

// The form and what's still moving. Finished requests live on Historia.
export default async function DriverPage() {
  const user = await requireUser("driver");
  const [cars, open, fuel] = await Promise.all([
    query<{ plate: string; name: string | null }>(
      "SELECT plate, name FROM cars WHERE driver_id = $1",
      [user.id],
    ),
    listOpenForRequester(user.id),
    getDriverFuelContext(user.id),
  ]);
  const car = cars[0];

  return (
    <main className="page">
      <LiveUpdates channel={driverChannel(user.id)} />
      <PageHeader title={`Habari, ${user.name.split(" ")[0]}`} description="Omba pesa na ufuatilie majibu hapa." />

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
                  {car.name}
                </p>
              ) : (
                <p className="mt-0.5 font-semibold">Bado hujapewa gari</p>
              )}
            </div>
          </section>

          <section className="card">
            <h2 className="mb-4 text-lg font-semibold">Omba pesa</h2>
            <RequestForm
              submit={createRequest}
              fuel={fuel}
              sent="Ombi limetumwa. Utaona jibu la meneja hapa; meneja wa kiwanda akiidhinisha, mhasibu atakulipa."
            />
          </section>
        </div>

        <section className="card">
          <h2 className="text-lg font-semibold">Yanayoendelea</h2>
          <p className="mb-2 text-sm text-muted">Yanasubiri meneja, meneja wa kiwanda, mhasibu akulipe, au risiti yake.</p>
          {open.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Hakuna ombi linaloendelea.</p>
          ) : (
            <ul className="divide-y divide-line">
              {open.map((r) => (
                <li key={r.id} className="flex items-start gap-4 py-3.5">
                  <RequestSummary request={r} mine />
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm">
            <Link href="/driver/history" className="font-medium text-accent underline">
              Historia ya maombi yako →
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
