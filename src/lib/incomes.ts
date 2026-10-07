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
  // Cargo income: the rate per tonne and tonnes behind the amount, and where it went. Null otherwise.
  rate_per_tonne: number | null;
  tonnes: string | null;
  destination: string | null;
  car_id: number | null;
  car: string | null;
  created_at: Date;
  // History typed in later: when it was entered. created_at is the day it happened.
  backfilled_at: Date | null;
  recorder_name: string | null;
  can_delete: boolean;
  // Saved although it looked like earlier income for this car: that entry's amount and date.
  duplicate_amount: string | null;
  duplicate_at: Date | null;
  // How much of `amount` the client has paid so far; less than `amount` while they still owe.
  amount_paid: string;
  // Named when the client paid only part of it at first.
  customer_name: string | null;
  // Money that came in for a part-paid entry, oldest first. Empty for entries paid in full at once.
  payments: IncomePayment[];
};

// `paid_at` arrives as an ISO string, since it comes through json_agg.
export type IncomePayment = { amount: number; paid_at: string; note: string | null; recorder_name: string | null };

// Each part-paid entry's payments as a JSON list, for an incomes row `i`.
const PAYMENTS = `coalesce((SELECT json_agg(json_build_object('amount', p.amount, 'paid_at', p.paid_at, 'note', p.note,
                                                         'recorder_name', pu.name) ORDER BY p.paid_at, p.id)
                    FROM income_payments p LEFT JOIN users pu ON pu.id = p.recorded_by
                   WHERE p.income_id = i.id), '[]')`;

export const INCOME_PAGE_SIZE = 25;

// Deleted entries are left out. `can_delete` marks the viewer's own entries entered in the last
// 24 hours. Newest first, by date, or by when they were entered with `byEntry`; `carId` narrows to one car.
export async function listIncomes(
  viewerId: number,
  opts: { page?: number; limit?: number; carId?: number | null; byEntry?: boolean } = {},
) {
  const limit = opts.limit ?? INCOME_PAGE_SIZE;
  const rows = await query<Income & { total_count: number }>(
    `SELECT i.id, i.source, i.amount, i.description, i.rate_per_tonne, i.tonnes, i.destination, i.car_id, c.name AS car, i.created_at,
            i.backfilled_at, u.name AS recorder_name, dup.amount AS duplicate_amount, dup.created_at AS duplicate_at,
            i.amount_paid, i.customer_name, ${PAYMENTS} AS payments,
            (i.recorded_by = $1 AND coalesce(i.backfilled_at, i.created_at) > now() - make_interval(hours => $3)) AS can_delete,
            count(*) OVER ()::int AS total_count
       FROM incomes i LEFT JOIN users u ON u.id = i.recorded_by LEFT JOIN cars c ON c.id = i.car_id
            LEFT JOIN incomes dup ON dup.id = i.duplicate_of
      WHERE i.deleted_at IS NULL AND ($5::int IS NULL OR i.car_id = $5)
      ORDER BY CASE WHEN $6 THEN coalesce(i.backfilled_at, i.created_at) END DESC, i.created_at DESC
      LIMIT $2 OFFSET $4`,
    [viewerId, limit, DELETE_WINDOW_HOURS, ((opts.page ?? 1) - 1) * limit, opts.carId ?? null, opts.byEntry ?? false],
  );
  return { rows, total: rows[0]?.total_count ?? 0 };
}

// Entries a client still owes on, oldest first, so the longest-standing debts are chased first.
// Any manager may record a payment on them.
export function listDebts() {
  return query<Income>(
    `SELECT i.id, i.source, i.amount, i.description, i.rate_per_tonne, i.tonnes, i.destination, i.car_id, c.name AS car, i.created_at,
            i.backfilled_at, u.name AS recorder_name, NULL AS duplicate_amount, NULL AS duplicate_at,
            i.amount_paid, i.customer_name, ${PAYMENTS} AS payments, false AS can_delete
       FROM incomes i LEFT JOIN users u ON u.id = i.recorded_by LEFT JOIN cars c ON c.id = i.car_id
      WHERE i.deleted_at IS NULL AND i.amount_paid < i.amount
      ORDER BY i.created_at, i.id`,
  );
}

// Income is dated by when it was recorded, in Tanzanian time. It counts each job's full value, paid
// or not; `owed` is what clients still owe on all of it.
export async function getIncomeTotals() {
  const rows = await query<{ this_month: string; last_month: string; all_time: string; owed: string; debts: number }>(
    `WITH local AS (SELECT date_trunc('month', now() AT TIME ZONE $1) AS month),
     income AS (SELECT amount, created_at AT TIME ZONE $1 AS at FROM incomes WHERE deleted_at IS NULL)
     SELECT
       (SELECT coalesce(sum(amount), 0) FROM income, local WHERE at >= month) AS this_month,
       (SELECT coalesce(sum(amount), 0) FROM income, local
         WHERE at >= month - interval '1 month' AND at < month) AS last_month,
       (SELECT coalesce(sum(amount), 0) FROM income) AS all_time,
       (SELECT coalesce(sum(amount - amount_paid), 0) FROM incomes WHERE deleted_at IS NULL) AS owed,
       (SELECT count(*)::int FROM incomes WHERE deleted_at IS NULL AND amount_paid < amount) AS debts`,
    [TIME_ZONE],
  );
  return rows[0];
}
