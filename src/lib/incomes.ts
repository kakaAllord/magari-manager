import "server-only";
import { query } from "@/lib/db";
import { TIME_ZONE } from "@/lib/time";

// How long after recording an entry its manager may still delete it.
export const DELETE_WINDOW_HOURS = 24;

export type Income = {
  id: number;
  source: string;
  amount: string;
  description: string | null;
  car: string | null;
  created_at: Date;
  // History typed in later: when it was entered. created_at is the day it happened.
  backfilled_at: Date | null;
  recorder_name: string | null;
  can_delete: boolean;
};

export const INCOME_PAGE_SIZE = 25;

// Deleted entries are left out. `can_delete` marks the viewer's own entries entered in the last
// 24 hours. Newest first, by date, or by when they were entered with `byEntry`; `carId` narrows to one car.
export async function listIncomes(
  viewerId: number,
  opts: { page?: number; limit?: number; carId?: number | null; byEntry?: boolean } = {},
) {
  const limit = opts.limit ?? INCOME_PAGE_SIZE;
  const rows = await query<Income & { total_count: number }>(
    `SELECT i.id, i.source, i.amount, i.description, c.make || ' ' || c.model AS car, i.created_at,
            i.backfilled_at, u.name AS recorder_name,
            (i.recorded_by = $1 AND coalesce(i.backfilled_at, i.created_at) > now() - make_interval(hours => $3)) AS can_delete,
            count(*) OVER ()::int AS total_count
       FROM incomes i LEFT JOIN users u ON u.id = i.recorded_by LEFT JOIN cars c ON c.id = i.car_id
      WHERE i.deleted_at IS NULL AND ($5::int IS NULL OR i.car_id = $5)
      ORDER BY CASE WHEN $6 THEN coalesce(i.backfilled_at, i.created_at) END DESC, i.created_at DESC
      LIMIT $2 OFFSET $4`,
    [viewerId, limit, DELETE_WINDOW_HOURS, ((opts.page ?? 1) - 1) * limit, opts.carId ?? null, opts.byEntry ?? false],
  );
  return { rows, total: rows[0]?.total_count ?? 0 };
}

// Income is dated by when it was recorded, in Tanzanian time.
export async function getIncomeTotals() {
  const rows = await query<{ this_month: string; last_month: string; all_time: string }>(
    `WITH local AS (SELECT date_trunc('month', now() AT TIME ZONE $1) AS month),
     income AS (SELECT amount, created_at AT TIME ZONE $1 AS at FROM incomes WHERE deleted_at IS NULL)
     SELECT
       (SELECT coalesce(sum(amount), 0) FROM income, local WHERE at >= month) AS this_month,
       (SELECT coalesce(sum(amount), 0) FROM income, local
         WHERE at >= month - interval '1 month' AND at < month) AS last_month,
       (SELECT coalesce(sum(amount), 0) FROM income) AS all_time`,
    [TIME_ZONE],
  );
  return rows[0];
}
