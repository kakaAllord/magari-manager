import { getT } from "@/lib/lang";
import { gaugeLabel } from "@/lib/fuel-calc";
import { formatDate, formatDateTime, formatKm, formatLitres, formatMoney } from "@/lib/format";
import type { MoneyRequest } from "@/lib/requests";
import { choiceLabel, paymentMethod } from "@/lib/voucher-fields";

// One request as every list shows it: amount, who asked, the reason, then each step with its time.
// `mine` hides the requester's own name on their pages.
export async function RequestSummary({ request: r, mine = false }: { request: MoneyRequest; mine?: boolean }) {
  const t = await getT();
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
            {r.requester_role === "manager" && t(" (meneja)", " (manager)")}
          </span>
        )}
      </p>
      <p className="text-sm break-words">
        {r.kind === "fuel" && r.reason !== "Mafuta" && (
          <span className="mr-1.5 rounded bg-accent-soft px-1.5 py-px text-xs font-medium text-accent">{t("Mafuta", "Fuel")}</span>
        )}
        {r.kind === "fuel" && r.reason === "Mafuta" ? t("Mafuta", "Fuel") : r.reason}
      </p>
      {r.items.length > 0 && (
        <ul className="mt-0.5 text-sm text-muted tabular-nums">
          {r.items.map((i, n) => (
            <li key={n} className="break-words">
              {i.description} · {Number(i.quantity).toLocaleString("en")} × {formatMoney(i.unit_price)} = {formatMoney(i.amount)}
            </li>
          ))}
        </ul>
      )}
      {/* The person who sent it was warned already; everyone after them sees the flag. */}
      {!mine && r.duplicate_of !== null && r.duplicate_amount !== null && r.duplicate_at !== null && (
        <p className="mt-1 text-xs">
          <span className="rounded bg-warn-soft px-1.5 py-px font-medium text-warn">{t("Huenda ni marudio", "Possible repeat")}</span>{" "}
          <span className="text-muted">
            {t(
              `ya ombi la ${formatMoney(r.duplicate_amount)} la ${formatDateTime(r.duplicate_at)}`,
              `of the ${formatMoney(r.duplicate_amount)} request of ${formatDateTime(r.duplicate_at)}`,
            )}
          </span>
        </p>
      )}
      {(r.odometer_km !== null || r.fuel_price !== null) && (
        <p className="text-sm text-muted tabular-nums">
          {[
            r.odometer_km !== null && `km ${formatKm(r.odometer_km)}`,
            r.gauge_eighths !== null && gaugeLabel(r.gauge_eighths, t),
            r.fuel_price !== null && t(`lita ${formatLitres(Number(r.amount) / r.fuel_price)}`, `${formatLitres(Number(r.amount) / r.fuel_price)} litres`) + ` × ${formatMoney(r.fuel_price)}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {r.backfilled_at && r.issued_at ? (
        // History typed in later: it was paid on its day, outside the app, so there are no steps to show.
        <p className="mt-1 text-xs text-muted">
          {r.car ?? t("Hakuna gari", "No car")}
          {" · "}<span className="font-medium text-warn">{t("Rekodi ya zamani", "Past record")}</span>{" "}
          {t(
            `ya ${formatDate(r.issued_at)} · imeingizwa na ${r.reviewer_name ?? "meneja"} ${formatDateTime(r.backfilled_at)}`,
            `of ${formatDate(r.issued_at)} · entered by ${r.reviewer_name ?? "the manager"} ${formatDateTime(r.backfilled_at)}`,
          )}
          {r.payment_method && ` · ${choiceLabel(paymentMethod(r.payment_method), t) ?? r.payment_method}`}
          {r.voucher_number && (
            <>
              {" · "}
              <a href={`/vouchers/${r.id}`} target="_blank" className="font-medium text-accent underline">
                Payment voucher {r.voucher_number}
              </a>
            </>
          )}
          {r.edited_at && (
            <>
              {" · "}
              <span className="font-medium text-warn">{t("Imebadilishwa", "Edited")}</span>{" "}
              {t(`na ${r.editor_name ?? "meneja"}`, `by ${r.editor_name ?? "the manager"}`)} {formatDateTime(r.edited_at)}
            </>
          )}
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted">
          {r.car ?? t("Hakuna gari", "No car")}
          {" · "}
          {t("Imetumwa", "Sent")} {formatDateTime(r.created_at)}
          {r.reviewed_at &&
            (selfApproved
              ? t(" · Ombi la meneja, limekubaliwa moja kwa moja", " · The manager's own request, approved directly")
              : r.status === "rejected" && !declinedByFactory
                ? t(
                    ` · Imekataliwa na ${r.reviewer_name ?? "meneja"} ${formatDateTime(r.reviewed_at)}`,
                    ` · Declined by ${r.reviewer_name ?? "the manager"} ${formatDateTime(r.reviewed_at)}`,
                  )
                : t(
                    ` · Imekubaliwa na ${r.reviewer_name ?? "meneja"} ${formatDateTime(r.reviewed_at)}`,
                    ` · Approved by ${r.reviewer_name ?? "the manager"} ${formatDateTime(r.reviewed_at)}`,
                  ))}
          {r.status === "approved" && t(" · Inasubiri meneja wa kiwanda", " · Awaiting the factory manager")}
          {/* Approvals from before the factory manager's step count as authorised and name nobody. */}
          {/* Only the factory manager authorises. A refusal says who refused, unless the name already does. */}
          {r.factory_reviewed_at &&
            r.factory_reviewer_name &&
            ` · ${declinedByFactory ? t("Imekataliwa", "Declined") : t("Imeidhinishwa", "Authorised")} ${t("na", "by")} ${r.factory_reviewer_name}${
              declinedByFactory && !/kiwanda/i.test(r.factory_reviewer_name) ? t(" (meneja wa kiwanda)", " (factory manager)") : ""
            } ${formatDateTime(r.factory_reviewed_at)}`}
          {r.status === "authorised" && t(" · Inasubiri mhasibu", " · Awaiting the accountant")}
          {/* Requests from before there was a mhasibu were paid on approval and name no issuer. */}
          {r.issued_at &&
            (r.issuer_name
              ? t(` · Imelipwa na ${r.issuer_name} ${formatDateTime(r.issued_at)}`, ` · Paid by ${r.issuer_name} ${formatDateTime(r.issued_at)}`)
              : t(" · Imelipwa", " · Paid"))}
          {r.issued_at && r.payment_method && ` · ${choiceLabel(paymentMethod(r.payment_method), t) ?? r.payment_method}`}
          {r.issue_note && ` · ${r.issue_note}`}
          {r.voucher_number && (
            <>
              {" · "}
              <a href={`/vouchers/${r.id}`} target="_blank" className="font-medium text-accent underline">
                Payment voucher {r.voucher_number}
              </a>
            </>
          )}
          {r.edited_at && (
            <>
              {" · "}
              <span className="font-medium text-warn">{t("Imebadilishwa", "Edited")}</span>{" "}
              {t(`na ${r.editor_name ?? "meneja"}`, `by ${r.editor_name ?? "the manager"}`)} {formatDateTime(r.edited_at)}
            </>
          )}
          {r.receipt === "due" &&
            (mine ? t(" · Peleka risiti kwa mhasibu", " · Take the receipt to the accountant") : t(" · Inasubiri risiti", " · Receipt awaited"))}
          {r.receipt === "added" && (
            <>
              {" · "}
              <a href={`/receipts/${r.id}`} target="_blank" className="font-medium text-accent underline">
                {t("Ona risiti", "See receipt")}
              </a>
              {r.receipt_note && ` (${t("Na.", "No.")} ${r.receipt_note})`}
            </>
          )}
        </p>
      )}
    </div>
  );
}
