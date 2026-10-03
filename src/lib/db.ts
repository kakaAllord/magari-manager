import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

const pool =
  globalForDb.pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

// A reading taken while a car had no driver (such as its starting reading) belongs to whoever is
// given the car next, so their first stretch is theirs. Run inside the transaction that assigns them.
export async function claimDriverlessReading(client: PoolClient, carId: number, driverId: number) {
  await client.query(
    `UPDATE fuel_readings SET driver_id = $2
      WHERE id = (SELECT id FROM fuel_readings WHERE car_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1)
        AND driver_id IS NULL`,
    [carId, driverId],
  );
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
