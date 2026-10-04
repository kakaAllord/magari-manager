import Link from "next/link";
import { authoriseRequest } from "@/app/actions/requests";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { RequestSummary } from "@/components/request-item";
import { formatMoney } from "@/lib/format";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { listAwaitingAuthorisation } from "@/lib/requests";
import { requireUser } from "@/lib/session";
import { getOverview } from "@/lib/stats";

// Only what the vehicle manager approved and waits for the factory manager. Everything decided lives on Historia.
export default async function FactoryRequestsPage() {
  await requireUser("factory_manager");
  const [waiting, o] = await Promise.all([listAwaitingAuthorisation(), getOverview()]);
  const total = waiting.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader
        title="Idhini"
        description={
          waiting.length > 0
            ? `${waiting.length === 1 ? "Ombi 1 limekubaliwa na linasubiri" : `Maombi ${waiting.length} yamekubaliwa na yanasubiri`} idhini yako, jumla ${formatMoney(total)}. Ukiidhinisha, yanakwenda kwa mhasibu kulipwa.`
            : "Hakuna ombi linalosubiri idhini yako kwa sasa."
        }
      />

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">
          Yanasubiri idhini <span className="text-muted">({waiting.length})</span>
        </h2>
        {waiting.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Umemaliza yote. 👍</p>
        ) : (
          <ul className="divide-y divide-line">
            {waiting.map((r) => (
              <li key={r.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <RequestSummary request={r} />
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <form action={authoriseRequest} className="grid">
                    <input type="hidden" name="id" value={r.id} />
                    <button name="decision" value="authorised" className="btn btn-primary">
                      Idhinisha
                    </button>
                  </form>
                  <form action={authoriseRequest} className="grid">
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
        {o.pending_count > 0 && (
          <p className="mt-3 text-sm text-muted">
            {o.pending_count === 1 ? "Ombi 1 bado liko" : `Maombi ${o.pending_count} bado yako`} kwa meneja wa magari (
            {formatMoney(o.pending_total)}). Yakikubaliwa yatafika hapa.
          </p>
        )}
        <p className="mt-3 text-sm">
          <Link href="/factory/history" className="font-medium text-accent underline">
            Historia ya maombi yote →
          </Link>
        </p>
      </section>
    </main>
  );
}
