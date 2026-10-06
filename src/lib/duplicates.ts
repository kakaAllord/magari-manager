import "server-only";
import { query } from "@/lib/db";
import { amountLikeness, DUPLICATE_AMOUNT_SHARE, DUPLICATE_DAYS, type DuplicateMatch } from "@/lib/duplicate-rules";
import { TIME_ZONE } from "@/lib/time";

// The rules of duplicate-rules.ts in SQL. `date` is a past day being typed in as history (dated
// midday, like the entry itself), or null for now. The closest match wins: nearest amount, then time.
const entryTime = (date: string, tz: string) =>
  `(SELECT CASE WHEN ${date}::date IS NULL THEN now() ELSE (${date}::date + time '12:00') AT TIME ZONE ${tz} END AS t)`;

const withMatch = (rows: (Omit<DuplicateMatch, "likeness">)[], amount: number): DuplicateMatch | null =>
  rows[0] ? { ...rows[0], likeness: amountLikeness(Number(rows[0].amount), amount) } : null;

// A request for the same car (or, with no car, by the same person for no car) of the same kind, not
// refused. Fuel compares litres where both sides have them, since the price differs between stations.
export async function findRequestDuplicate(r: {
  carId: number | null;
  requesterId: number;
  kind: "fuel" | "other";
  amount: number;
  litres: number | null;
  date: string | null;
}): Promise<DuplicateMatch | null> {
  const rows = await query<Omit<DuplicateMatch, "likeness">>(
    `WITH at AS ${entryTime("$6", "$9")}
     SELECT r.id, r.amount, r.created_at AS at, u.name AS who, c.plate, r.reason AS text,
            r.backfilled_at IS NOT NULL AS backfilled
       FROM money_requests r JOIN users u ON u.id = r.requester_id LEFT JOIN cars c ON c.id = r.car_id, at
      WHERE r.status <> 'rejected' AND r.kind = $3
        AND CASE WHEN $1::int IS NULL THEN r.car_id IS NULL AND r.requester_id = $2 ELSE r.car_id = $1 END
        AND CASE WHEN $3 = 'fuel' AND r.fuel_price IS NOT NULL AND $5::numeric IS NOT NULL
                 THEN abs(r.amount / r.fuel_price - $5) <= $7 * greatest(r.amount / r.fuel_price, $5)
                 ELSE abs(r.amount - $4) <= $7 * greatest(r.amount, $4) END
        AND r.created_at BETWEEN at.t - make_interval(days => $8) AND at.t + make_interval(days => $8)
      ORDER BY abs(r.amount - $4), abs(extract(epoch FROM r.created_at - at.t))
      LIMIT 1`,
    [r.carId, r.requesterId, r.kind, r.amount, r.litres, r.date, DUPLICATE_AMOUNT_SHARE, DUPLICATE_DAYS[r.kind], TIME_ZONE],
  );
  return withMatch(rows, r.amount);
}

// Income for the same car, not deleted, close in amount and date.
export async function findIncomeDuplicate(i: { carId: number; amount: number; date: string | null }): Promise<DuplicateMatch | null> {
  const rows = await query<Omit<DuplicateMatch, "likeness">>(
    `WITH at AS ${entryTime("$3", "$6")}
     SELECT i.id, i.amount, i.created_at AS at, u.name AS who, c.plate,
            nullif(concat_ws(' · ', i.destination, i.description), '') AS text,
            i.backfilled_at IS NOT NULL AS backfilled
       FROM incomes i LEFT JOIN users u ON u.id = i.recorded_by LEFT JOIN cars c ON c.id = i.car_id, at
      WHERE i.deleted_at IS NULL AND i.car_id = $1
        AND abs(i.amount - $2) <= $4 * greatest(i.amount, $2)
        AND i.created_at BETWEEN at.t - make_interval(days => $5) AND at.t + make_interval(days => $5)
      ORDER BY abs(i.amount - $2), abs(extract(epoch FROM i.created_at - at.t))
      LIMIT 1`,
    [i.carId, i.amount, i.date, DUPLICATE_AMOUNT_SHARE, DUPLICATE_DAYS.income, TIME_ZONE],
  );
  return withMatch(rows, i.amount);
}
