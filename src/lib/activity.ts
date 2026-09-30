import "server-only";
import { query } from "@/lib/db";

// One timeline of what happened across the business, newest first. `subject` is the other person
// involved: who was paid, or the role a new staff member was given.
type Base = { at: Date; actor: string | null; subject: string | null };
export type Activity = Base &
  (
    | { kind: "request" | "self_request"; amount: string; detail: string; plate: string | null }
    | { kind: "approved" | "rejected" | "issued"; amount: string; detail: string; plate: string | null }
    | { kind: "income" | "income_deleted"; amount: string; detail: string; plate: null }
    | { kind: "staff"; amount: null; detail: string; plate: null }
  );

// A manager's own request is approved as it's made, so it shows once, as "self_request".
export const listActivity = (limit = 40) =>
  query<Activity>(
    `SELECT * FROM (
       SELECT CASE WHEN d.role = 'manager' THEN 'self_request' ELSE 'request' END AS kind,
              r.created_at AS at, d.name AS actor, NULL AS subject, r.amount, r.reason AS detail, c.plate
         FROM money_requests r
         JOIN users d ON d.id = r.requester_id
         LEFT JOIN cars c ON c.id = r.car_id
       UNION ALL
       SELECT r.status, r.reviewed_at, m.name, NULL, r.amount, r.reason, c.plate
         FROM money_requests r
         LEFT JOIN users m ON m.id = r.reviewed_by
         LEFT JOIN cars c ON c.id = r.car_id
        WHERE r.reviewed_at IS NOT NULL AND r.reviewed_by IS DISTINCT FROM r.requester_id
       UNION ALL
       SELECT 'issued', r.issued_at, a.name, d.name, r.amount, r.reason, c.plate
         FROM money_requests r
         JOIN users a ON a.id = r.issued_by
         JOIN users d ON d.id = r.requester_id
         LEFT JOIN cars c ON c.id = r.car_id
       UNION ALL
       SELECT 'income', i.created_at, u.name, NULL, i.amount, i.source, NULL
         FROM incomes i LEFT JOIN users u ON u.id = i.recorded_by
       UNION ALL
       SELECT 'income_deleted', i.deleted_at, u.name, NULL, i.amount, i.source, NULL
         FROM incomes i LEFT JOIN users u ON u.id = i.deleted_by
        WHERE i.deleted_at IS NOT NULL
       UNION ALL
       SELECT 'staff', created_at, name, role, NULL, email, NULL
         FROM users WHERE role IN ('manager', 'accountant')
     ) e
     ORDER BY at DESC LIMIT $1`,
    [limit],
  );
