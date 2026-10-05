import { gaugeLabel } from "@/lib/fuel-calc";
import { formatDate, formatDateTime, formatKm, formatMoney } from "@/lib/format";
import type { MoneyRequest } from "@/lib/requests";

// One request as every list shows it: amount, who asked, the reason, then each step with its time.
// `mine` hides the requester's own name on their pages.
export function RequestSummary({ request: r, mine = false }: { request: MoneyRequest; mine?: boolean }) {
  const selfApproved = r.requester_role === "manager" && r.status !== "pending";
  // Rejected by the factory manager, after the vehicle manager approved it.
  const declinedByFactory = r.status === "rejected" && r.factory_reviewed_at !== null;
  return (
    <div className="min-w-0 flex-1">
      <p className="font-semibold tabular-nums">
        {formatMoney(r.amount)}
        {!mine && (
          <span className="font-normal text-muted">
            {" "}
            · {r.requester_name}
            {r.requester_role === "manager" && " (meneja)"}
          </span>
        )}
      </p>
      <p className="text-sm break-words">
        {r.kind === "fuel" && r.reason !== "Mafuta" && (
          <span className="mr-1.5 rounded bg-accent-soft px-1.5 py-px text-xs font-medium text-accent">Mafuta</span>
        )}
        {r.reason}
      </p>
      {r.odometer_km !== null && r.gauge_eighths !== null && (
        <p className="text-sm text-muted tabular-nums">
          km {formatKm(r.odometer_km)} · {gaugeLabel(r.gauge_eighths)}
        </p>
      )}
      {r.backfilled_at && r.issued_at ? (
        // History typed in later: it was paid on its day, outside the app, so there are no steps to show.
        <p className="mt-1 text-xs text-muted">
          {r.car ?? "Hakuna gari"} · <span className="font-medium text-warn">Rekodi ya zamani</span> ya{" "}
          {formatDate(r.issued_at)} · imeingizwa na {r.reviewer_name ?? "meneja"} {formatDateTime(r.backfilled_at)}
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted">
          {r.car ?? "Hakuna gari"} · Imetumwa {formatDateTime(r.created_at)}
          {r.reviewed_at &&
            (selfApproved
              ? " · Ombi la meneja, limekubaliwa moja kwa moja"
              : ` · ${r.status === "rejected" && !declinedByFactory ? "Imekataliwa" : "Imekubaliwa"} na ${r.reviewer_name ?? "meneja"} ${formatDateTime(r.reviewed_at)}`)}
          {r.status === "approved" && " · Inasubiri meneja wa kiwanda"}
          {/* Approvals from before the factory manager's step count as authorised and name nobody. */}
          {/* Only the factory manager authorises. A refusal says who refused, unless the name already does. */}
          {r.factory_reviewed_at &&
            r.factory_reviewer_name &&
            ` · ${declinedByFactory ? "Imekataliwa" : "Imeidhinishwa"} na ${r.factory_reviewer_name}${
              declinedByFactory && !/kiwanda/i.test(r.factory_reviewer_name) ? " (meneja wa kiwanda)" : ""
            } ${formatDateTime(r.factory_reviewed_at)}`}
          {r.status === "authorised" && " · Inasubiri mhasibu"}
          {/* Requests from before there was a mhasibu were paid on approval and name no issuer. */}
          {r.issued_at &&
            (r.issuer_name ? ` · Imelipwa na ${r.issuer_name} ${formatDateTime(r.issued_at)}` : " · Imelipwa")}
          {r.issue_note && ` · ${r.issue_note}`}
          {r.receipt === "due" && (mine ? " · Peleka risiti kwa mhasibu" : " · Inasubiri risiti")}
          {r.receipt === "added" && (
            <>
              {" · "}
              <a href={`/receipts/${r.id}`} target="_blank" className="font-medium text-accent underline">
                Ona risiti
              </a>
              {r.receipt_note && ` (Na. ${r.receipt_note})`}
            </>
          )}
        </p>
      )}
    </div>
  );
}
