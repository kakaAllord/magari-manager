import Link from "next/link";
import { reviewRequest } from "@/app/actions/requests";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { RequestSummary } from "@/components/request-item";
import { formatMoney } from "@/lib/format";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { listPending } from "@/lib/requests";
import { requireUser } from "@/lib/session";

// Only what needs a decision. Everything decided lives on Historia.
export default async function RequestsPage() {
  await requireUser("manager");
  const pending = await listPending();
  const pendingTotal = pending.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader
        title="Maombi"
        description={
          pending.length > 0
            ? `Maombi ${pending.length} yanasubiri idhini yako, jumla ${formatMoney(pendingTotal)}. Ukikubali, yanakwenda kwa mhasibu.`
            : "Hakuna ombi linalosubiri kwa sasa."
        }
      />

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">
          Yanasubiri idhini <span className="text-muted">({pending.length})</span>
        </h2>
        {pending.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Umemaliza yote. 👍</p>
        ) : (
          <ul className="divide-y divide-line">
            {pending.map((r) => (
              <li key={r.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <RequestSummary request={r} />
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <form action={reviewRequest} className="grid">
                    <input type="hidden" name="id" value={r.id} />
                    <button name="decision" value="approved" className="btn btn-primary">
                      Kubali
                    </button>
                  </form>
                  <form action={reviewRequest} className="grid">
                    <input type="hidden" name="id" value={r.id} />
                    <button name="decision" value="rejected" className="btn btn-ghost text-danger">
                      Kataa
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm">
          <Link href="/manager/history" className="font-medium text-accent underline">
            Historia ya maombi yote →
          </Link>
        </p>
      </section>
    </main>
  );
}
