import Link from "next/link";
import { createManagerRequest } from "@/app/actions/requests";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { RequestForm } from "@/components/request-form";
import { RequestSummary } from "@/components/request-item";
import { StatusBadge } from "@/components/status-badge";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { listCars } from "@/lib/reports";
import { listHistory } from "@/lib/requests";
import { requireUser } from "@/lib/session";

const RECENT = 5;

export default async function ManagerAskPage() {
  const manager = await requireUser("manager");
  const [cars, mine] = await Promise.all([listCars(), listHistory({ page: 1, requesterId: manager.id })]);
  const recent = mine.rows.slice(0, RECENT);

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader
        title="Omba pesa"
        description="Ombi lako linakubaliwa moja kwa moja na kwenda kwa mhasibu. Mkurugenzi analiona kwenye taarifa zake."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <section className="card">
          <h2 className="mb-4 text-lg font-semibold">Ombi jipya</h2>
          <RequestForm
            submit={createManagerRequest}
            cars={cars}
            sent="Ombi limekubaliwa na limepelekwa kwa mhasibu."
          />
        </section>

        <section className="card">
          <h2 className="mb-2 text-lg font-semibold">Maombi yako ya karibuni</h2>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Bado hujaomba pesa.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((r) => (
                <li key={r.id} className="flex items-start gap-4 py-3.5">
                  <RequestSummary request={r} mine />
                  <StatusBadge status={r.status} />
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
      </div>
    </main>
  );
}
