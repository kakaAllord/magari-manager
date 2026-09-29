import { reviewRequest } from "@/app/actions/requests";
import { AutoRefresh } from "@/components/auto-refresh";
import { Header } from "@/components/header";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime, formatMoney } from "@/lib/format";
import { listRequestsByStatus, type MoneyRequest } from "@/lib/requests";
import { requireUser } from "@/lib/session";
import { managerLinks } from "./nav";

export default async function ManagerPage() {
  const user = await requireUser("manager");
  const [pending, reviewed] = await Promise.all([
    listRequestsByStatus(true),
    listRequestsByStatus(false),
  ]);

  return (
    <>
      <Header user={user} links={managerLinks} />
      <AutoRefresh />
      <main className="page">
        <section className="card">
          <h2 className="mb-4 text-lg font-semibold">
            Waiting for approval <span className="text-muted">({pending.length})</span>
          </h2>
          {pending.length === 0 ? (
            <p className="text-sm text-muted">Nothing to review right now.</p>
          ) : (
            <ul className="divide-y divide-line">
              {pending.map((r) => (
                <li key={r.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-start">
                  <RequestSummary request={r} />
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <form action={reviewRequest} className="grid">
                      <input type="hidden" name="id" value={r.id} />
                      <button name="decision" value="approved" className="btn btn-primary">
                        Approve
                      </button>
                    </form>
                    <form action={reviewRequest} className="grid">
                      <input type="hidden" name="id" value={r.id} />
                      <button name="decision" value="rejected" className="btn btn-ghost">
                        Reject
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="mb-4 text-lg font-semibold">Recently reviewed</h2>
          {reviewed.length === 0 ? (
            <p className="text-sm text-muted">No reviewed requests yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {reviewed.map((r) => (
                <li key={r.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 py-3">
                  <RequestSummary request={r} />
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

function RequestSummary({ request: r }: { request: MoneyRequest }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="font-medium">
        {formatMoney(r.amount)} <span className="font-normal text-muted">· {r.driver_name}</span>
      </p>
      <p className="break-words text-sm">{r.reason}</p>
      <p className="mt-1 text-xs text-muted">
        {r.car ?? "No car"} · Sent {formatDateTime(r.created_at)}
        {r.reviewed_at && ` · Reviewed by ${r.reviewer_name ?? "a manager"} on ${formatDateTime(r.reviewed_at)}`}
      </p>
    </div>
  );
}
