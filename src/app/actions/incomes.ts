"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { DELETE_WINDOW_HOURS } from "@/lib/incomes";
import { MANAGERS_CHANNEL, notify } from "@/lib/realtime";
import { todayInTanzania } from "@/lib/reports";
import { requireUser } from "@/lib/session";
import { TIME_ZONE } from "@/lib/time";
import { parseEntryDate, parseIncome, type IncomeErrors, type IncomeInput } from "@/lib/validation";

export type IncomeFormState =
  | { ok: true; message: string }
  | { ok: false; errors: IncomeErrors & { date?: string }; values: IncomeInput & { date: string } }
  | undefined;

export async function createIncome(_prev: IncomeFormState, formData: FormData): Promise<IncomeFormState> {
  const manager = await requireUser("manager");
  const values = {
    carId: String(formData.get("carId") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    description: String(formData.get("description") ?? ""),
    date: String(formData.get("date") ?? ""),
  };
  const parsed = parseIncome(values);
  const date = parseEntryDate(values.date, todayInTanzania());
  if (!parsed.ok || "error" in date) {
    return { ok: false, errors: { ...(parsed.ok ? {} : parsed.errors), ...("error" in date ? { date: date.error } : {}) }, values };
  }

  // `source` keeps the plate as it is now, so lists and the feed read the same as older entries.
  // A past date is history: it's dated midday that day, and backfilled_at says when it was typed in.
  const inserted = await query<{ source: string }>(
    `INSERT INTO incomes (car_id, source, amount, description, recorded_by, created_at, backfilled_at)
     SELECT id, plate, $2, $3, $4,
            CASE WHEN $5::date IS NULL THEN now() ELSE ($5::date + time '12:00') AT TIME ZONE $6 END,
            CASE WHEN $5::date IS NULL THEN NULL ELSE now() END
       FROM cars WHERE id = $1
     RETURNING source`,
    [parsed.carId, parsed.amount, parsed.description, manager.id, date.date, TIME_ZONE],
  );
  if (inserted.length === 0) {
    return { ok: false, errors: { carId: "Gari hilo halipo tena. Chagua jingine." }, values };
  }
  revalidatePath("/manager", "layout");
  revalidatePath("/director", "layout");
  // Directors and other managers listen on the managers' channel.
  await notify([MANAGERS_CHANNEL]);
  return {
    ok: true,
    message: date.date
      ? `Mapato ya zamani ya gari ${inserted[0].source} yamehifadhiwa.`
      : `Mapato ya gari ${inserted[0].source} yamehifadhiwa.`,
  };
}

export type DeleteIncomeState = { ok: false; message: string } | undefined;

// Only the manager who recorded an entry may delete it, and only within the window after it was
// typed in (for history, after it was entered, not its date). The row is kept and marked deleted.
export async function deleteIncome(_prev: DeleteIncomeState, formData: FormData): Promise<DeleteIncomeState> {
  const manager = await requireUser("manager");
  const incomeId = Number(formData.get("incomeId"));
  if (!Number.isInteger(incomeId)) return { ok: false, message: "Mapato hayajulikani." };

  const deleted = await query(
    `UPDATE incomes SET deleted_at = now(), deleted_by = $2
      WHERE id = $1 AND recorded_by = $2 AND deleted_at IS NULL
        AND coalesce(backfilled_at, created_at) > now() - make_interval(hours => $3)
      RETURNING id`,
    [incomeId, manager.id, DELETE_WINDOW_HOURS],
  );
  if (deleted.length === 0) {
    return { ok: false, message: `Hayawezi kufutwa tena: zimepita saa ${DELETE_WINDOW_HOURS} au yamefutwa tayari.` };
  }
  revalidatePath("/manager", "layout");
  revalidatePath("/director", "layout");
  await notify([MANAGERS_CHANNEL]);
}
