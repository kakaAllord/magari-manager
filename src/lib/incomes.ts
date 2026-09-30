import "server-only";
import { query } from "@/lib/db";
import { TIME_ZONE } from "@/lib/time";

export type Income = {
  id: number;
  source: string;
  amount: string;
  description: string | null;
  created_at: Date;
  recorder_name: string | null;
};

export const listIncomes = (limit = 100) =>
  query<Income>(
    `SELECT i.id, i.source, i.amount, i.description, i.created_at, u.name AS recorder_name
       FROM incomes i LEFT JOIN users u ON u.id = i.recorded_by
      ORDER BY i.created_at DESC LIMIT $1`,
    [limit],
  );

// Income is dated by when it was recorded, in Tanzanian time.
export async function getIncomeTotals() {
  const rows = await query<{ this_month: string; last_month: string; all_time: string }>(
    `WITH local AS (SELECT date_trunc('month', now() AT TIME ZONE $1) AS month),
     income AS (SELECT amount, created_at AT TIME ZONE $1 AS at FROM incomes)
     SELECT
       (SELECT coalesce(sum(amount), 0) FROM income, local WHERE at >= month) AS this_month,
       (SELECT coalesce(sum(amount), 0) FROM income, local
         WHERE at >= month - interval '1 month' AND at < month) AS last_month,
       (SELECT coalesce(sum(amount), 0) FROM income) AS all_time`,
    [TIME_ZONE],
  );
  return rows[0];
}
