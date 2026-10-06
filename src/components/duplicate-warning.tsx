import type { DuplicateMatch } from "@/lib/duplicate-rules";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";

// Shown above the submit button when the entry looks like one already there. The hidden field
// tells the server this match was seen, so pressing the button again saves the entry anyway.
export function DuplicateWarning({ match, what }: { match: DuplicateMatch; what: string }) {
  return (
    <div role="alert" className="grid gap-1 rounded-lg border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm">
      <input type="hidden" name="duplicateOk" value={match.id} />
      <p className="font-semibold text-warn">Inaonekana imeshawekwa</p>
      <p className="break-words">
        {what} ya {match.plate ?? "bila gari"} · <span className="font-semibold tabular-nums">{formatMoney(match.amount)}</span>
        {match.text && ` · ${match.text}`} · {match.backfilled ? formatDate(match.at) : formatDateTime(match.at)}
        {match.who && ` · ${match.who}`}
      </p>
      <p className="text-muted">
        Kiasi kinafanana kwa {match.likeness}%. Kama ni jipya kweli, bonyeza tena kuhifadhi; wanaoidhinisha wataona alama ya
        marudio.
      </p>
    </div>
  );
}
