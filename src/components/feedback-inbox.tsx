import { getT } from "@/lib/lang";
import { markFeedbackRead } from "@/app/actions/feedback";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { Pager } from "@/components/pager";
import { FEEDBACK_PAGE_SIZE, listFeedbackForReader } from "@/lib/feedback";
import { formatWallDate } from "@/lib/format";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import type { User } from "@/lib/session";

// Drivers' maoni as the meneja, meneja wa kiwanda and mkurugenzi read them: the text and the day,
// never who wrote it. Each reader marks a note read for themselves.
export async function FeedbackInbox({ reader, page }: { reader: User; page: number }) {
  const t = await getT();
  const { rows, total, unread } = await listFeedbackForReader(reader.id, page);

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader
        title={t("Maoni ya madereva", "Drivers' feedback")}
        description={
          unread > 0
            ? t(`Mapya ${unread} · jumla ${total}`, `${unread} new · ${total} in all`)
            : t(`Yote yamesomwa · jumla ${total}`, `All read · ${total} in all`)
        }
      />
      <section className="card">
        <p className="mb-2 text-sm text-muted">{t("Hayana jina: madereva wanatoa maoni bila kujulikana.", "No names: drivers give feedback anonymously.")}</p>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{t("Bado hakuna maoni.", "No feedback yet.")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((f) => (
              <li key={f.id} className="flex items-start gap-3 py-3.5">
                <span
                  aria-hidden
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${f.read ? "bg-transparent" : "bg-accent"}`}
                />
                <div className="grid min-w-0 flex-1 gap-1">
                  <p className={`break-words whitespace-pre-line ${f.read ? "text-sm" : "text-sm font-medium"}`}>{f.body}</p>
                  <p className="text-xs text-muted">
                    {formatWallDate(f.day)}
                    {f.read && t(" · Umesoma", " · Read")}
                  </p>
                </div>
                {!f.read && (
                  <form action={markFeedbackRead} className="shrink-0">
                    <input type="hidden" name="id" value={f.id} />
                    <button type="submit" className="btn btn-ghost">
                      {t("Nimesoma", "Mark read")}
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        <Pager page={page} total={total} pageSize={FEEDBACK_PAGE_SIZE} />
      </section>
    </main>
  );
}
