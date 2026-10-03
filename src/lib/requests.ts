import "server-only";
import { query } from "@/lib/db";

// "issued" isn't stored as a status: it is an approved request the mhasibu has paid out.
export type RequestStatus = "pending" | "approved" | "rejected" | "issued";

export type MoneyRequest = {
  id: number;
  amount: string;
  reason: string;
  status: RequestStatus;
  created_at: Date;
  reviewed_at: Date | null;
  issued_at: Date | null;
  issue_note: string | null;
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
};

const SELECT = `
  SELECT r.id, r.amount, r.reason,
         CASE WHEN r.issued_at IS NOT NULL THEN 'issued' ELSE r.status END AS status,
         r.created_at, r.reviewed_at, r.issued_at, r.issue_note,
         r.requester_id, d.name AS requester_name, d.role AS requester_role,
         m.name AS reviewer_name, a.name AS issuer_name,
         CASE WHEN c.id IS NULL THEN NULL ELSE c.make || ' ' || c.model || ' · ' || c.plate END AS car,
         r.kind, fr.odometer_km, fr.gauge_eighths,
         count(*) OVER ()::int AS total_count
    FROM money_requests r
    JOIN users d ON d.id = r.requester_id
    LEFT JOIN users m ON m.id = r.reviewed_by
    LEFT JOIN users a ON a.id = r.issued_by
    LEFT JOIN cars c ON c.id = r.car_id
    LEFT JOIN fuel_readings fr ON fr.request_id = r.id`;

export const PAGE_SIZE = 25;

type Page = { rows: MoneyRequest[]; total: number };
const paged = (rows: (MoneyRequest & { total_count: number })[]): Page => ({
  rows,
  total: rows[0]?.total_count ?? 0,
});

// Waiting for a manager, oldest first.
export const listPending = () =>
  query<MoneyRequest>(`${SELECT} WHERE r.status = 'pending' ORDER BY r.created_at ASC`);

// Approved and waiting for the mhasibu, oldest approval first.
export const listAwaitingIssue = () =>
  query<MoneyRequest>(
    `${SELECT} WHERE r.status = 'approved' AND r.issued_at IS NULL ORDER BY r.reviewed_at ASC`,
  );

// Still moving: pending, or approved but not yet paid. Newest first.
export const listOpenForRequester = (requesterId: number) =>
  query<MoneyRequest>(
    `${SELECT} WHERE r.requester_id = $1 AND (r.status = 'pending' OR (r.status = 'approved' AND r.issued_at IS NULL))
     ORDER BY r.created_at DESC`,
    [requesterId],
  );

export type HistoryFilter = "all" | "approved" | "issued" | "rejected";

// Everything past the manager's decision (or everything one person asked for), newest first.
export async function listHistory(opts: {
  page: number;
  filter?: HistoryFilter;
  carId?: number | null;
  requesterId?: number;
}): Promise<Page> {
  const filter = opts.filter ?? "all";
  const rows = await query<MoneyRequest & { total_count: number }>(
    `${SELECT}
      WHERE ($1::int IS NULL OR r.requester_id = $1)
        AND ($1::int IS NOT NULL OR r.status <> 'pending')
        AND ($2::int IS NULL OR r.car_id = $2)
        AND CASE $3
              WHEN 'approved' THEN r.status = 'approved' AND r.issued_at IS NULL
              WHEN 'issued' THEN r.issued_at IS NOT NULL
              WHEN 'rejected' THEN r.status = 'rejected'
              ELSE true
            END
      ORDER BY coalesce(r.issued_at, r.reviewed_at, r.created_at) DESC
      LIMIT $4 OFFSET $5`,
    [opts.requesterId ?? null, opts.carId ?? null, filter, PAGE_SIZE, (opts.page - 1) * PAGE_SIZE],
  );
  return paged(rows);
}
