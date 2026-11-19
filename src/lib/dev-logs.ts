import "server-only";
import { query } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export type LogLevel = "auth" | "ok" | "info" | "warn" | "error" | "sys";
export type LogArea = "auth" | "request" | "income" | "invoice" | "staff" | "fleet" | "fuel" | "maoni" | "db";
export type LogEntry = { key: string; at: string; level: LogLevel; area: LogArea; actor: string; text: string };

// The dev console's log. Apart from sign-ins (auth_events), nothing writes to it: every line is read
// from the timestamps the app already keeps, so the history goes back to the first day. Maoni stay
// anonymous here too. Impersonation is never logged.
const EVENTS = `
  SELECT 'auth:' || e.id AS key, 0 AS ord, e.created_at AS at,
         CASE e.kind WHEN 'sign_in_failed' THEN 'error' ELSE 'auth' END AS level, 'auth' AS area,
         coalesce(u.name, 'unknown') AS actor,
         CASE e.kind
           WHEN 'sign_in' THEN 'signed in'
           WHEN 'sign_out' THEN 'signed out'
           ELSE 'failed sign-in as "' || coalesce(e.login, '') || '"'
         END || coalesce(' · ' || e.ip, '') AS text, NULL::numeric AS amount
    FROM auth_events e LEFT JOIN users u ON u.id = e.user_id
  UNION ALL
  SELECT 'req:' || m.id || ':new', 1, m.created_at, 'info', 'request', r.name,
         'asked {amount} #' || m.id || ' · ' || coalesce(c.plate, 'no car') || ' · ' || left(coalesce(m.reason, m.kind, ''), 60), m.amount
    FROM money_requests m JOIN users r ON r.id = m.requester_id LEFT JOIN cars c ON c.id = m.car_id
  UNION ALL
  SELECT 'req:' || m.id || ':review', 2, m.reviewed_at,
         CASE WHEN m.status = 'rejected' AND m.factory_reviewed_at IS NULL THEN 'warn' ELSE 'ok' END, 'request',
         coalesce(u.name, 'system'),
         CASE WHEN m.status = 'rejected' AND m.factory_reviewed_at IS NULL THEN 'rejected' ELSE 'approved' END
           || ' request #' || m.id || ' ({amount})', m.amount
    FROM money_requests m LEFT JOIN users u ON u.id = m.reviewed_by WHERE m.reviewed_at IS NOT NULL
  UNION ALL
  SELECT 'req:' || m.id || ':factory', 3, m.factory_reviewed_at,
         CASE m.status WHEN 'rejected' THEN 'warn' ELSE 'ok' END, 'request', coalesce(u.name, 'system'),
         CASE m.status WHEN 'rejected' THEN 'declined' ELSE 'authorised' END || ' request #' || m.id || ' ({amount})', m.amount
    FROM money_requests m LEFT JOIN users u ON u.id = m.factory_reviewed_by WHERE m.factory_reviewed_at IS NOT NULL
  UNION ALL
  SELECT 'req:' || m.id || ':paid', 4, m.issued_at, 'ok', 'request', coalesce(u.name, 'system'),
         'paid {amount} on request #' || m.id || coalesce(' · ' || m.payment_method, ''), m.amount
    FROM money_requests m LEFT JOIN users u ON u.id = m.issued_by WHERE m.issued_at IS NOT NULL
  UNION ALL
  SELECT 'req:' || m.id || ':edit', 6, m.edited_at, 'info', 'request', coalesce(u.name, 'system'),
         'edited request #' || m.id || ' (now {amount})', m.amount
    FROM money_requests m LEFT JOIN users u ON u.id = m.edited_by WHERE m.edited_at IS NOT NULL
  UNION ALL
  SELECT 'rcpt:' || rc.request_id, 5, rc.created_at, 'ok', 'request', coalesce(u.name, 'system'),
         'added the receipt for request #' || rc.request_id, NULL
    FROM receipts rc LEFT JOIN users u ON u.id = rc.uploaded_by
  UNION ALL
  SELECT 'inc:' || i.id || ':new', 1, i.created_at, 'info', 'income', coalesce(u.name, 'system'),
         'recorded income {amount} #' || i.id || ' · ' || coalesce(i.source, '')
           || CASE WHEN i.amount_paid IS NOT NULL AND i.amount_paid < i.amount THEN ' · on credit' ELSE '' END, i.amount
    FROM incomes i LEFT JOIN users u ON u.id = i.recorded_by
  UNION ALL
  SELECT 'inc:' || i.id || ':edit', 6, i.edited_at, 'info', 'income', coalesce(u.name, 'system'),
         'edited income #' || i.id || ' (now {amount})', i.amount
    FROM incomes i LEFT JOIN users u ON u.id = i.edited_by WHERE i.edited_at IS NOT NULL
  UNION ALL
  SELECT 'inc:' || i.id || ':del', 7, i.deleted_at, 'warn', 'income', coalesce(u.name, 'system'),
         'deleted income #' || i.id || ' ({amount})', i.amount
    FROM incomes i LEFT JOIN users u ON u.id = i.deleted_by WHERE i.deleted_at IS NOT NULL
  UNION ALL
  SELECT 'pay:' || p.id, 4, p.paid_at, 'ok', 'income', coalesce(u.name, 'system'),
         'took a payment of {amount} on income #' || p.income_id, p.amount
    FROM income_payments p LEFT JOIN users u ON u.id = p.recorded_by
  UNION ALL
  SELECT 'inv:' || v.id || ':new', 0, v.created_at, 'info', 'invoice', coalesce(u.name, 'system'),
         'made invoice ' || v.number || ' for ' || coalesce(v.customer_name, '?') || ' ({amount})', v.total
    FROM invoices v LEFT JOIN users u ON u.id = v.created_by
  UNION ALL
  SELECT 'inv:' || v.id || ':paid', 4, v.paid_at, 'ok', 'invoice', coalesce(u.name, 'system'),
         'marked invoice ' || v.number || ' paid ({amount})', v.total
    FROM invoices v LEFT JOIN users u ON u.id = v.paid_by WHERE v.paid_at IS NOT NULL
  UNION ALL
  SELECT 'inv:' || v.id || ':cancel', 7, v.cancelled_at, 'warn', 'invoice', coalesce(u.name, 'system'),
         'cancelled invoice ' || v.number || coalesce(': ' || left(v.cancel_reason, 60), ''), NULL
    FROM invoices v LEFT JOIN users u ON u.id = v.cancelled_by WHERE v.cancelled_at IS NOT NULL
  UNION ALL
  SELECT 'user:' || n.id || ':new', 0, n.created_at, 'sys', 'staff', coalesce(a.name, 'system'),
         'account created: ' || n.name || ' (' || n.role || ')', NULL
    FROM users n LEFT JOIN users a ON a.id = n.added_by
  UNION ALL
  SELECT 'user:' || n.id || ':off', 0, n.deactivated_at, 'warn', 'staff', 'system',
         'account switched off: ' || n.name, NULL
    FROM users n WHERE n.deactivated_at IS NOT NULL
  UNION ALL
  SELECT 'car:' || c.id, 0, c.created_at, 'sys', 'fleet', 'system', 'car added ' || c.plate, NULL
    FROM cars c
  UNION ALL
  SELECT 'fuel:' || f.id, 0, f.created_at, 'info', 'fuel', coalesce(u.name, 'system'),
         'fuel reading ' || c.plate || ' · ' || f.odometer_km || ' km · gauge ' || f.gauge_eighths || '/8', NULL
    FROM fuel_readings f JOIN cars c ON c.id = f.car_id LEFT JOIN users u ON u.id = f.recorded_by
  UNION ALL
  SELECT 'maoni:' || id, 0, created_at, 'info', 'maoni', 'a driver', 'sent maoni (' || length(body) || ' characters)', NULL
    FROM feedback
  UNION ALL
  SELECT 'mig:' || name, 0, applied_at, 'sys', 'db', 'migrate', 'applied ' || name, NULL
    FROM schema_migrations`;

type Row = Omit<LogEntry, "at" | "text"> & { at: Date; text: string; amount: string | null; ord: number };

// The newest lines, oldest first, so a terminal can print them top to bottom. With `after`, only the
// lines newer than it (for live polling).
export async function readLogs({ after, limit = 300 }: { after?: string; limit?: number } = {}): Promise<LogEntry[]> {
  const rows = await query<Row>(
    `SELECT * FROM (${EVENTS}) e
      WHERE e.at IS NOT NULL AND ($1::timestamptz IS NULL OR e.at > $1::timestamptz)
      ORDER BY e.at DESC, e.ord DESC, e.key DESC
      LIMIT $2`,
    [after ?? null, limit],
  );
  return rows.reverse().map(({ key, level, area, actor, amount, at, text }) => ({
    key,
    level,
    area,
    actor,
    at: at.toISOString(),
    text: amount === null ? text : text.replaceAll("{amount}", formatMoney(amount)),
  }));
}
