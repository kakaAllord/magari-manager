import "server-only";
import { query } from "@/lib/db";

export type RequestStatus = "pending" | "approved" | "rejected";

export type MoneyRequest = {
  id: number;
  amount: string;
  reason: string;
  status: RequestStatus;
  created_at: Date;
  reviewed_at: Date | null;
  driver_name: string;
  reviewer_name: string | null;
  car: string | null;
};

const SELECT = `
  SELECT r.id, r.amount, r.reason, r.status, r.created_at, r.reviewed_at,
         d.name AS driver_name, m.name AS reviewer_name,
         CASE WHEN c.id IS NULL THEN NULL ELSE c.make || ' ' || c.model || ' · ' || c.plate END AS car
    FROM money_requests r
    JOIN users d ON d.id = r.requester_id
    LEFT JOIN users m ON m.id = r.reviewed_by
    LEFT JOIN cars c ON c.id = r.car_id`;

export const listRequestsForDriver = (driverId: number) =>
  query<MoneyRequest>(`${SELECT} WHERE r.requester_id = $1 ORDER BY r.created_at DESC`, [driverId]);

export const listRequestsByStatus = (pending: boolean) =>
  query<MoneyRequest>(
    `${SELECT} WHERE (r.status = 'pending') = $1
     ORDER BY ${pending ? "r.created_at ASC" : "r.reviewed_at DESC"} LIMIT 100`,
    [pending],
  );
