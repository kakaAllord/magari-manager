"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { MANAGERS_CHANNEL, notify } from "@/lib/realtime";
import { requireUser } from "@/lib/session";
import { parseIncome, type IncomeErrors, type IncomeInput } from "@/lib/validation";

export type IncomeFormState =
  | { ok: true; message: string }
  | { ok: false; errors: IncomeErrors; values: IncomeInput }
  | undefined;

export async function createIncome(_prev: IncomeFormState, formData: FormData): Promise<IncomeFormState> {
  const manager = await requireUser("manager");
  const values = {
    source: String(formData.get("source") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    description: String(formData.get("description") ?? ""),
  };
  const parsed = parseIncome(values);
  if (!parsed.ok) return { ok: false, errors: parsed.errors, values };

  await query("INSERT INTO incomes (source, amount, description, recorded_by) VALUES ($1, $2, $3, $4)", [
    parsed.source,
    parsed.amount,
    parsed.description,
    manager.id,
  ]);
  revalidatePath("/manager", "layout");
  revalidatePath("/director", "layout");
  // Directors and other managers listen on the managers' channel.
  await notify([MANAGERS_CHANNEL]);
  return { ok: true, message: `Mapato kutoka "${parsed.source}" yamehifadhiwa.` };
}
