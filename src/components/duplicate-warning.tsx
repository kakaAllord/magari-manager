"use client";

import { useT } from "./lang-provider";
import type { DuplicateMatch } from "@/lib/duplicate-rules";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";

// Shown above the submit button when the entry looks like one already there. The hidden field
// tells the server this match was seen, so pressing the button again saves the entry anyway.
export function DuplicateWarning({ match, what }: { match: DuplicateMatch; what: string }) {
  const t = useT();
  return (
    <div role="alert" className="grid gap-1 rounded-lg border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm">
      <input type="hidden" name="duplicateOk" value={match.id} />
      <p className="font-semibold text-warn">{t("Inaonekana imeshawekwa", "This looks like it was entered already")}</p>
      <p className="break-words">
        {t(`${what} ya ${match.plate ?? "bila gari"}`, `${what} for ${match.plate ?? "no car"}`)} · <span className="font-semibold tabular-nums">{formatMoney(match.amount)}</span>
        {match.text && ` · ${match.text}`} · {match.backfilled ? formatDate(match.at) : formatDateTime(match.at)}
        {match.who && ` · ${match.who}`}
      </p>
      <p className="text-muted">
        {t(
          `Kiasi kinafanana kwa ${match.likeness}%. Kama ni jipya kweli, bonyeza tena kuhifadhi; wanaoidhinisha wataona alama ya marudio.`,
          `The amount is ${match.likeness}% alike. If it really is new, press again to save; whoever authorises it will see a possible-repeat mark.`,
        )}
      </p>
    </div>
  );
}
