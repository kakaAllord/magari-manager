import { getT } from "@/lib/lang";
import Link from "next/link";
import { createManagerRequest } from "@/app/actions/requests";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { RequestForm } from "@/components/request-form";
import { EditRequest } from "@/components/edit-request";
import { RequestSummary } from "@/components/request-item";
import { StatusBadge } from "@/components/status-badge";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { listCars, todayInTanzania } from "@/lib/reports";
import { listHistory } from "@/lib/requests";
import { requireUser } from "@/lib/session";

const RECENT = 5;

export default async function ManagerAskPage() {
  const manager = await requireUser("manager");
  const t = await getT();
  const [cars, mine] = await Promise.all([listCars(), listHistory({ page: 1, requesterId: manager.id, byEntry: true })]);
  const recent = mine.rows.slice(0, RECENT);

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader
        title={t("Omba pesa", "Ask for money")}
        description={t(
          "Ombi lako linakubaliwa moja kwa moja na kwenda kwa meneja wa kiwanda kuidhinishwa, kisha kwa mhasibu. Kwa matumizi ya zamani, chagua tarehe yake: yanahifadhiwa kama yaliyokwisha lipwa.",
          "Your request is approved directly and goes to the factory manager to authorise, then to the accountant. For past spending, pick its date: it is saved as already paid.",
        )}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <section className="card">
          <h2 className="mb-4 text-lg font-semibold">{t("Ombi jipya", "New request")}</h2>
          <RequestForm
            submit={createManagerRequest}
            cars={cars}
            today={todayInTanzania()}
            sent={t("Ombi limekubaliwa na limepelekwa kwa meneja wa kiwanda.", "Request approved and sent to the factory manager.")}
          />
        </section>

        <section className="card">
          <h2 className="mb-2 text-lg font-semibold">{t("Maombi yako ya karibuni", "Your recent requests")}</h2>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{t("Bado hujaomba pesa.", "You haven't asked for money yet.")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((r) => (
                <li key={r.id} className="flex items-start gap-4 py-3.5">
                  <RequestSummary request={r} mine />
                  <div className="grid justify-items-end gap-2">
                    <StatusBadge status={r.status} />
                    {r.can_edit && <EditRequest request={r} today={todayInTanzania()} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm">
            <Link href="/manager/history" className="font-medium text-accent underline">
              {t("Historia ya maombi yote", "History of all requests")} →
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
