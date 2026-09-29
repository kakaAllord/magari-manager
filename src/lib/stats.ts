import "server-only";
import { query } from "@/lib/db";
import { TIME_ZONE } from "@/lib/time";

// An expense is an approved request, dated by when it was approved (Tanzanian time).

export type Overview = {
  cars: number;
  cars_without_driver: number;
  drivers: number;
  drivers_without_car: number;
  pending_count: number;
  pending_total: string;
  this_month: string;
  last_month: string;
  this_week: string;
  all_time: string;
};

export async function getOverview() {
  const rows = await query<Overview>(
    `WITH local AS (SELECT (now() AT TIME ZONE $1) AS now_local),
     spend AS (
       SELECT r.amount, r.reviewed_at AT TIME ZONE $1 AS at
         FROM money_requests r WHERE r.status = 'approved'
     )
     SELECT
       (SELECT count(*)::int FROM cars) AS cars,
       (SELECT count(*)::int FROM cars WHERE driver_id IS NULL) AS cars_without_driver,
       (SELECT count(*)::int FROM users WHERE role = 'driver') AS drivers,
       (SELECT count(*)::int FROM users u WHERE role = 'driver'
          AND NOT EXISTS (SELECT 1 FROM cars c WHERE c.driver_id = u.id)) AS drivers_without_car,
       (SELECT count(*)::int FROM money_requests WHERE status = 'pending') AS pending_count,
       (SELECT coalesce(sum(amount), 0) FROM money_requests WHERE status = 'pending') AS pending_total,
       (SELECT coalesce(sum(amount), 0) FROM spend, local
         WHERE at >= date_trunc('month', now_local)) AS this_month,
       (SELECT coalesce(sum(amount), 0) FROM spend, local
         WHERE at >= date_trunc('month', now_local) - interval '1 month'
           AND at < date_trunc('month', now_local)) AS last_month,
       (SELECT coalesce(sum(amount), 0) FROM spend, local
         WHERE at >= date_trunc('week', now_local)) AS this_week,
       (SELECT coalesce(sum(amount), 0) FROM spend) AS all_time`,
    [TIME_ZONE],
  );
  return rows[0];
}

// Approved spend for each of the last `months` months, oldest first, including empty months.
export function getMonthlySpend(months = 6) {
  return query<{ month: Date; label: string; total: string }>(
    `WITH local AS (SELECT date_trunc('month', now() AT TIME ZONE $1) AS this_month),
     months AS (
       SELECT generate_series(this_month - ($2::int - 1) * interval '1 month', this_month, interval '1 month') AS month
         FROM local
     )
     SELECT m.month, to_char(m.month, 'Mon YYYY') AS label,
            coalesce(sum(r.amount), 0) AS total
       FROM months m
       LEFT JOIN money_requests r
         ON r.status = 'approved'
        AND r.reviewed_at AT TIME ZONE $1 >= m.month
        AND r.reviewed_at AT TIME ZONE $1 < m.month + interval '1 month'
      GROUP BY m.month ORDER BY m.month`,
    [TIME_ZONE, months],
  );
}

// This month's approved spend per car, biggest first; cars with no spend are included.
export function getSpendByCarThisMonth() {
  return query<{ id: number; plate: string; car: string; driver: string | null; count: number; total: string }>(
    `SELECT c.id, c.plate, c.make || ' ' || c.model AS car, u.name AS driver,
            count(r.id)::int AS count, coalesce(sum(r.amount), 0) AS total
       FROM cars c
       LEFT JOIN users u ON u.id = c.driver_id
       LEFT JOIN money_requests r
         ON r.car_id = c.id AND r.status = 'approved'
        AND r.reviewed_at AT TIME ZONE $1 >= date_trunc('month', now() AT TIME ZONE $1)
      GROUP BY c.id, u.name
      ORDER BY total DESC, c.plate`,
    [TIME_ZONE],
  );
}
