import { formatDateTime, formatMoney } from "@/lib/format";
import type { MoneyRequest } from "@/lib/requests";

// One request as every list shows it: amount, who asked, the reason, then each step with its time.
// `mine` hides the requester's own name on their pages.
export function RequestSummary({ request: r, mine = false }: { request: MoneyRequest; mine?: boolean }) {
  const selfApproved = r.requester_role === "manager" && r.status !== "pending";
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
      <p className="text-sm break-words">{r.reason}</p>
      <p className="mt-1 text-xs text-muted">
        {r.car ?? "Hakuna gari"} · Imetumwa {formatDateTime(r.created_at)}
        {r.reviewed_at &&
          (selfApproved
            ? " · Ombi la meneja, limekubaliwa moja kwa moja"
            : ` · ${r.status === "rejected" ? "Imekataliwa" : "Imekubaliwa"} na ${r.reviewer_name ?? "meneja"} ${formatDateTime(r.reviewed_at)}`)}
        {r.status === "approved" && " · Inasubiri mhasibu"}
        {/* Requests from before there was a mhasibu were paid on approval and name no issuer. */}
        {r.issued_at && (r.issuer_name ? ` · Imelipwa na ${r.issuer_name} ${formatDateTime(r.issued_at)}` : " · Imelipwa")}
        {r.issue_note && ` · ${r.issue_note}`}
      </p>
    </div>
  );
}
