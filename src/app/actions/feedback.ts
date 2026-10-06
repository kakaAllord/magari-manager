"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireFeedbackReader } from "@/lib/feedback";
import { driverChannel, MANAGERS_CHANNEL, notify } from "@/lib/realtime";
import { requireUser } from "@/lib/session";
import { parseFeedback } from "@/lib/validation";

export type FeedbackState = { ok: true } | { ok: false; error: string; body: string } | undefined;

const READER_AREAS = ["/manager/maoni", "/factory/maoni", "/director/maoni"];

export async function sendFeedback(_prev: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const driver = await requireUser("driver");
  const body = String(formData.get("body") ?? "");
  const parsed = parseFeedback(body);
  if ("error" in parsed) return { ok: false, error: parsed.error, body };

  await query("INSERT INTO feedback (author_id, body) VALUES ($1, $2)", [driver.id, parsed.body]);
  revalidatePath("/driver/maoni");
  for (const area of READER_AREAS) revalidatePath(area);
  await notify([MANAGERS_CHANNEL]);
  return { ok: true };
}

// Marks one note read for this reader only. The author's id never leaves the server: it is used
// just to tell that driver's page that their note has been read.
export async function markFeedbackRead(formData: FormData) {
  const reader = await requireFeedbackReader();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const marked = await query<{ author_id: number }>(
    `WITH ins AS (INSERT INTO feedback_reads (feedback_id, reader_id)
                  SELECT id, $2 FROM feedback WHERE id = $1
                  ON CONFLICT DO NOTHING RETURNING feedback_id)
     SELECT f.author_id FROM feedback f JOIN ins ON ins.feedback_id = f.id`,
    [id, reader.id],
  );
  for (const area of READER_AREAS) revalidatePath(area);
  revalidatePath("/driver/maoni");
  if (marked[0]) await notify([driverChannel(marked[0].author_id)]);
}
