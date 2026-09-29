import { AutoRefresh } from "@/components/auto-refresh";
import { Header } from "@/components/header";
import { StatusBadge } from "@/components/status-badge";
import { query } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
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

  return (
    <>
      <Header user={user} links={[{ href: "/driver", label: "My requests" }]} />
      <AutoRefresh />
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
        <section className="card">
          <h2 className="text-sm font-medium text-muted">Your car</h2>
          <p className="mt-1 text-lg font-semibold">
            {car ? `${car.make} ${car.model} · ${car.plate}` : "No car assigned yet"}
          </p>
        </section>

        <section className="card">
          <h2 className="mb-4 text-lg font-semibold">Request money</h2>
          <RequestForm />
        </section>

        <section className="card">
          <h2 className="mb-4 text-lg font-semibold">My requests</h2>
          {requests.length === 0 ? (
            <p className="text-sm text-muted">You haven&apos;t sent any requests yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {requests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{formatMoney(r.amount)}</p>
                    <p className="break-words text-sm">{r.reason}</p>
                    <p className="mt-1 text-xs text-muted">
                      Sent {formatDateTime(r.created_at)}
                      {r.reviewed_at &&
                        ` · ${r.status === "approved" ? "Approved" : "Rejected"} by ${r.reviewer_name ?? "a manager"} on ${formatDateTime(r.reviewed_at)}`}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
