import { getT } from "@/lib/lang";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { listOwnFeedback } from "@/lib/feedback";
import { formatDateTime } from "@/lib/format";
import { driverChannel } from "@/lib/realtime";
import { requireUser } from "@/lib/session";
import { FeedbackForm } from "./feedback-form";

// A suggestion box. What a driver writes reaches the managers and the director without their name.
export default async function DriverFeedbackPage() {
  const user = await requireUser("driver");
  const t = await getT();
  const mine = await listOwnFeedback(user.id);

  return (
    <main className="page">
      <LiveUpdates channel={driverChannel(user.id)} />
      <PageHeader title={t("Maoni", "Feedback")} description={t("Toa wazo, ushauri au malalamiko kuhusu kazi.", "Share an idea, advice or a complaint about the work.")} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <section className="card grid gap-3">
          <h2 className="text-lg font-semibold">{t("Sanduku la maoni", "Suggestion box")}</h2>
          <p className="text-sm text-muted">
            {t(
              "Yanasomwa na meneja, meneja wa kiwanda na mkurugenzi. Hawaoni jina lako wala gari lako.",
              "Read by the manager, the factory manager and the director. They see neither your name nor your car.",
            )}
          </p>
          <FeedbackForm />
        </section>

        <section className="card">
          <h2 className="text-lg font-semibold">{t("Uliyotuma", "What you sent")}</h2>
          {mine.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{t("Bado hujatuma maoni.", "You haven't sent any feedback yet.")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {mine.map((f) => (
                <li key={f.id} className="grid gap-1 py-3.5">
                  <p className="text-sm break-words whitespace-pre-line">{f.body}</p>
                  <p className="text-xs text-muted">
                    {formatDateTime(f.created_at)} ·{" "}
                    {f.read ? <span className="font-medium text-ok">{t("Yamesomwa", "Read")}</span> : t("Bado kusomwa", "Not read yet")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
