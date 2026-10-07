import "server-only";
import { query } from "@/lib/db";

// Only pending, approved and rejected are stored. "authorised" is an approved request the factory
// manager has let through to the mhasibu; "issued" is one the mhasibu has paid out.
export type RequestStatus = "pending" | "approved" | "authorised" | "rejected" | "issued";

export type MoneyRequest = {
  id: number;
  amount: string;
  reason: string;
  status: RequestStatus;
  created_at: Date;
  reviewed_at: Date | null;
  // The factory manager's decision: authorised, or declined when the status is rejected.
  factory_reviewed_at: Date | null;
  factory_reviewer_name: string | null;
  issued_at: Date | null;
  issue_note: string | null;
  // The payment voucher (hati ya malipo) of a payment made in the app; typed-in history has none.
  voucher_number: string | null;
  requester_id: number;
  requester_name: string;
  requester_role: "driver" | "manager";
  reviewer_name: string | null;
  issuer_name: string | null;
  car: string | null;
  kind: "fuel" | "other";
  // The driver's reading that came with a fuel request.
  odometer_km: number | null;
  gauge_eighths: number | null;
  // The price per litre typed with a fuel request (or the fixed one older requests were saved with).
  fuel_price: number | null;
  // A paid request's receipt: still awaited, or added by the mhasibu. Older payments have none.
  receipt: "due" | "added" | null;
  receipt_note: string | null;
  // History typed in later: when it was entered. Its dates are the day it happened.
  backfilled_at: Date | null;
  // Sent although it looked like an earlier request: that one's amount and date, for the flag.
  duplicate_of: number | null;
  duplicate_amount: string | null;
  duplicate_at: Date | null;
};

const SELECT = `
  SELECT r.id, r.amount, r.reason,
         CASE WHEN r.issued_at IS NOT NULL THEN 'issued'
              WHEN r.status = 'approved' AND r.factory_reviewed_at IS NOT NULL THEN 'authorised'
              ELSE r.status END AS status,
         r.created_at, r.reviewed_at, r.factory_reviewed_at, f.name AS factory_reviewer_name, r.issued_at, r.issue_note, pv.number AS voucher_number, r.backfilled_at,
         r.requester_id, d.name AS requester_name, d.role AS requester_role,
         m.name AS reviewer_name, a.name AS issuer_name,
         CASE WHEN c.id IS NULL THEN NULL ELSE concat_ws(' · ', c.name, c.plate) END AS car,
         r.kind, fr.odometer_km, fr.gauge_eighths, r.fuel_price,
         CASE WHEN EXISTS (SELECT 1 FROM receipts rc WHERE rc.request_id = r.id) THEN 'added'
              WHEN r.receipt_due THEN 'due' END AS receipt,
         (SELECT rc.note FROM receipts rc WHERE rc.request_id = r.id) AS receipt_note,
         r.duplicate_of, dup.amount AS duplicate_amount, dup.created_at AS duplicate_at,
         count(*) OVER ()::int AS total_count
    FROM money_requests r
    JOIN users d ON d.id = r.requester_id
    LEFT JOIN users m ON m.id = r.reviewed_by
    LEFT JOIN users f ON f.id = r.factory_reviewed_by
    LEFT JOIN users a ON a.id = r.issued_by
    LEFT JOIN cars c ON c.id = r.car_id
    LEFT JOIN fuel_readings fr ON fr.request_id = r.id
    LEFT JOIN money_requests dup ON dup.id = r.duplicate_of
    LEFT JOIN payment_vouchers pv ON pv.request_id = r.id`;

export const PAGE_SIZE = 25;

type Page = { rows: MoneyRequest[]; total: number };
const paged = (rows: (MoneyRequest & { total_count: number })[]): Page => ({
  rows,
  total: rows[0]?.total_count ?? 0,
});

// Waiting for a manager, oldest first.
export const listPending = () =>
  query<MoneyRequest>(`${SELECT} WHERE r.status = 'pending' ORDER BY r.created_at ASC`);

// Approved by the vehicle manager and waiting for the factory manager, oldest approval first.
export const listAwaitingAuthorisation = () =>
  query<MoneyRequest>(
    `${SELECT} WHERE r.status = 'approved' AND r.factory_reviewed_at IS NULL ORDER BY r.reviewed_at ASC`,
  );

// Authorised and waiting for the mhasibu, oldest authorisation first.
export const listAwaitingIssue = () =>
  query<MoneyRequest>(
    `${SELECT} WHERE r.status = 'approved' AND r.factory_reviewed_at IS NOT NULL AND r.issued_at IS NULL
      ORDER BY r.factory_reviewed_at ASC`,
  );

// Paid, and the mhasibu still needs the receipt. Oldest payment first.
const AWAITING_RECEIPT = "r.receipt_due AND NOT EXISTS (SELECT 1 FROM receipts rc WHERE rc.request_id = r.id)";
export const listAwaitingReceipt = () =>
  query<MoneyRequest>(`${SELECT} WHERE ${AWAITING_RECEIPT} ORDER BY r.issued_at ASC`);

// Still moving: pending, approved (by one or both managers) but not yet paid, or paid with the receipt still to bring. Newest first.
export const listOpenForRequester = (requesterId: number) =>
  query<MoneyRequest>(
    `${SELECT} WHERE r.requester_id = $1
       AND (r.status = 'pending' OR (r.status = 'approved' AND r.issued_at IS NULL) OR ${AWAITING_RECEIPT})
     ORDER BY r.created_at DESC`,
    [requesterId],
  );

// A payment with its voucher, to print. Given a requester, only one of theirs.
export async function getVoucherRequest(id: number, requesterId: number | null) {
  const [row] = await query<MoneyRequest>(
    `${SELECT} WHERE r.id = $1 AND pv.number IS NOT NULL AND ($2::int IS NULL OR r.requester_id = $2)`,
    [id, requesterId],
  );
  return row ?? null;
}

export type HistoryFilter = "all" | "approved" | "authorised" | "issued" | "rejected";

// Everything past the vehicle manager's decision (or everything one person asked for), newest first.
// `byEntry` sorts by when each was entered, so history just typed in shows at the top.
export async function listHistory(opts: {
  page: number;
  filter?: HistoryFilter;
  carId?: number | null;
  requesterId?: number;
  byEntry?: boolean;
}): Promise<Page> {
  const filter = opts.filter ?? "all";
  const rows = await query<MoneyRequest & { total_count: number }>(
    `${SELECT}
      WHERE ($1::int IS NULL OR r.requester_id = $1)
        AND ($1::int IS NOT NULL OR r.status <> 'pending')
        AND ($2::int IS NULL OR r.car_id = $2)
        AND CASE $3
              WHEN 'approved' THEN r.status = 'approved' AND r.factory_reviewed_at IS NULL
              WHEN 'authorised' THEN r.status = 'approved' AND r.factory_reviewed_at IS NOT NULL AND r.issued_at IS NULL
              WHEN 'issued' THEN r.issued_at IS NOT NULL
              WHEN 'rejected' THEN r.status = 'rejected'
              ELSE true
            END
      ORDER BY CASE WHEN $6 THEN r.backfilled_at END DESC NULLS LAST,
               coalesce(r.issued_at, r.reviewed_at, r.created_at) DESC
      LIMIT $4 OFFSET $5`,
    [opts.requesterId ?? null, opts.carId ?? null, filter, PAGE_SIZE, (opts.page - 1) * PAGE_SIZE, opts.byEntry ?? false],
  );
  return paged(rows);
}
