"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { parseDuplicateOk, type DuplicateMatch } from "@/lib/duplicate-rules";
import { findIncomeDuplicate } from "@/lib/duplicates";
import { DELETE_WINDOW_HOURS } from "@/lib/incomes";
import { MANAGERS_CHANNEL, notify } from "@/lib/realtime";
import { todayInTanzania } from "@/lib/reports";
import { requireUser } from "@/lib/session";
import { TIME_ZONE } from "@/lib/time";
import { parseCargo, parseEntryDate, parseIncome, type IncomeErrors, type IncomeInput } from "@/lib/validation";

type CargoErrors = { rate?: string; tonnes?: string; destination?: string };
type IncomeValues = IncomeInput & { kind: string; rate: string; tonnes: string; destination: string; date: string };

export type IncomeFormState =
  | { ok: true; message: string }
  | { ok: false; errors: IncomeErrors & CargoErrors & { date?: string }; values: IncomeValues; duplicate?: DuplicateMatch }
  | undefined;

export async function createIncome(_prev: IncomeFormState, formData: FormData): Promise<IncomeFormState> {
  const manager = await requireUser("manager");
  // A page opened before cargo existed sends no kind, so it keeps recording a plain amount.
  const values: IncomeValues = {
    kind: formData.get("kind") === "cargo" ? "cargo" : "other",
    carId: String(formData.get("carId") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    rate: String(formData.get("rate") ?? ""),
    tonnes: String(formData.get("tonnes") ?? ""),
    destination: String(formData.get("destination") ?? ""),
    description: String(formData.get("description") ?? ""),
    date: String(formData.get("date") ?? ""),
  };
  // Cargo is typed as a rate per tonne and the tonnes; its amount is worked out here, never taken
  // from the form. A cargo entry with mistakes reports them itself, so "1" stands in meanwhile.
  const cargo = values.kind === "cargo" ? parseCargo(values.rate, values.tonnes, values.destination) : null;
  const amount = cargo ? ("amount" in cargo ? String(cargo.amount) : "1") : values.amount;
  const parsed = parseIncome({ ...values, amount });
  const date = parseEntryDate(values.date, todayInTanzania());
  if (!parsed.ok || "error" in date || (cargo && "errors" in cargo)) {
    return {
      ok: false,
      errors: {
        ...(parsed.ok ? {} : parsed.errors),
        ...(cargo && "errors" in cargo ? cargo.errors : {}),
        ...("error" in date ? { date: date.error } : {}),
      },
      values,
    };
  }
  const load = cargo && "amount" in cargo ? cargo : null;

  // Income like one already there for this car warns first. Sent again with that match's id, it is
  // saved and marked, so it still shows as a possible repeat.
  const duplicate = await findIncomeDuplicate({ carId: parsed.carId, amount: Number(parsed.amount), date: date.date });
  if (duplicate && duplicate.id !== parseDuplicateOk(formData.get("duplicateOk"))) {
    return { ok: false, errors: {}, values, duplicate };
  }

  // `source` keeps the plate as it is now, so lists and the feed read the same as older entries.
  // A past date is history: it's dated midday that day, and backfilled_at says when it was typed in.
  const inserted = await query<{ source: string }>(
    `INSERT INTO incomes (car_id, source, amount, description, recorded_by, created_at, backfilled_at,
                          rate_per_tonne, tonnes, destination, duplicate_of)
     SELECT id, plate, $2, $3, $4,
            CASE WHEN $5::date IS NULL THEN now() ELSE ($5::date + time '12:00') AT TIME ZONE $6 END,
            CASE WHEN $5::date IS NULL THEN NULL ELSE now() END,
            $7, $8, $9, $10
       FROM cars WHERE id = $1
     RETURNING source`,
    [parsed.carId, parsed.amount, parsed.description, manager.id, date.date, TIME_ZONE, load?.rate ?? null, load?.tonnes ?? null, load?.destination ?? null, duplicate?.id ?? null],
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
