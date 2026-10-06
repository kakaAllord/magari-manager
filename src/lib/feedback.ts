import "server-only";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { homeFor, requireUser, type Role, type User } from "@/lib/session";
import { TIME_ZONE } from "@/lib/time";

// Who reads drivers' maoni. Drivers write them.
export const FEEDBACK_READERS: Role[] = ["manager", "factory_manager", "director"];

export async function requireFeedbackReader(): Promise<User> {
  const user = await requireUser();
  if (!FEEDBACK_READERS.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

export const FEEDBACK_PAGE_SIZE = 25;

// What a reader sees. Maoni are anonymous: no author, no car, and only the day it was sent, since
// a time of day could point at the one driver who was in the office then.
export type FeedbackForReader = { id: number; body: string; day: string; read: boolean };

export async function listFeedbackForReader(readerId: number, page: number) {
  const rows = await query<FeedbackForReader & { total_count: number; unread_count: number }>(
    `SELECT f.id, f.body, to_char(f.created_at AT TIME ZONE $2, 'YYYY-MM-DD') AS day,
            EXISTS (SELECT 1 FROM feedback_reads r WHERE r.feedback_id = f.id AND r.reader_id = $1) AS read,
            count(*) OVER ()::int AS total_count,
            (SELECT count(*) FROM feedback g
              WHERE NOT EXISTS (SELECT 1 FROM feedback_reads r WHERE r.feedback_id = g.id AND r.reader_id = $1))::int AS unread_count
       FROM feedback f
      ORDER BY f.created_at DESC, f.id DESC
      LIMIT $3 OFFSET $4`,
    [readerId, TIME_ZONE, FEEDBACK_PAGE_SIZE, (page - 1) * FEEDBACK_PAGE_SIZE],
  );
  return { rows, total: rows[0]?.total_count ?? 0, unread: rows[0]?.unread_count ?? 0 };
}

// A driver's own maoni, newest first, with whether anyone has read each one yet.
export type OwnFeedback = { id: number; body: string; created_at: Date; read: boolean };

export const listOwnFeedback = (authorId: number) =>
  query<OwnFeedback>(
    `SELECT f.id, f.body, f.created_at, EXISTS (SELECT 1 FROM feedback_reads r WHERE r.feedback_id = f.id) AS read
       FROM feedback f WHERE f.author_id = $1
      ORDER BY f.created_at DESC, f.id DESC LIMIT 50`,
    [authorId],
  );
