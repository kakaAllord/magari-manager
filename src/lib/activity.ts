import "server-only";
import { query } from "@/lib/db";

// One timeline of what happened across the business, newest first.
export type Activity =
  | { kind: "request"; at: Date; actor: string | null; amount: string; detail: string; plate: string | null }
  | { kind: "approved" | "rejected"; at: Date; actor: string | null; amount: string; detail: string; plate: string | null }
  | { kind: "income" | "income_deleted"; at: Date; actor: string | null; amount: string; detail: string; plate: null }
  | { kind: "manager"; at: Date; actor: string | null; amount: null; detail: string; plate: null };

export const listActivity = (limit = 40) =>
  query<Activity>(
    `SELECT * FROM (
       SELECT 'request' AS kind, r.created_at AS at, d.name AS actor, r.amount, r.reason AS detail, c.plate
         FROM money_requests r
         JOIN users d ON d.id = r.requester_id
         LEFT JOIN cars c ON c.id = r.car_id
       UNION ALL
       SELECT r.status, r.reviewed_at, m.name, r.amount, r.reason, c.plate
         FROM money_requests r
         LEFT JOIN users m ON m.id = r.reviewed_by
         LEFT JOIN cars c ON c.id = r.car_id
        WHERE r.reviewed_at IS NOT NULL
       UNION ALL
       SELECT 'income', i.created_at, u.name, i.amount, i.source, NULL
         FROM incomes i LEFT JOIN users u ON u.id = i.recorded_by
       UNION ALL
       SELECT 'income_deleted', i.deleted_at, u.name, i.amount, i.source, NULL
         FROM incomes i LEFT JOIN users u ON u.id = i.deleted_by
        WHERE i.deleted_at IS NOT NULL
       UNION ALL
       SELECT 'manager', created_at, name, NULL, email, NULL
         FROM users WHERE role = 'manager'
     ) e
     ORDER BY at DESC LIMIT $1`,
    [limit],
  );
