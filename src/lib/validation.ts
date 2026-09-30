// Pure validation, kept free of server imports so it can be unit tested with node --test.

export type RequestInput = { amount: string; reason: string };
export type RequestErrors = { amount?: string; reason?: string };

// Whole Tanzanian shillings; the numeric(10, 2) column tops out just under 100M.
const MAX_AMOUNT = 99_999_999;
export const MAX_REASON_LENGTH = 500;

// Accepts "40000" or "40,000" (commas only as thousands separators).
function parseAmount(input: string): { amount: string } | { error: string } {
  const typed = input.trim();
  const raw = /^\d{1,3}(,\d{3})+$/.test(typed) ? typed.replaceAll(",", "") : typed;
  if (!/^\d+$/.test(raw)) return { error: "Andika kiasi kamili cha shilingi, mfano 40000 au 40,000." };
  if (Number(raw) <= 0) return { error: "Kiasi lazima kiwe zaidi ya sifuri." };
  if (Number(raw) > MAX_AMOUNT) return { error: "Kiasi ni kikubwa mno." };
  return { amount: String(Number(raw)) };
}

export function parseMoneyRequest(input: RequestInput):
  | { ok: true; amount: string; reason: string }
  | { ok: false; errors: RequestErrors } {
  const errors: RequestErrors = {};
  const amount = parseAmount(input.amount);
  if ("error" in amount) errors.amount = amount.error;

  const reason = input.reason.trim();
  if (reason.length < 3) errors.reason = "Mweleze meneja pesa ni za nini.";
  else if (reason.length > MAX_REASON_LENGTH) {
    errors.reason = `Sababu isizidi herufi ${MAX_REASON_LENGTH}.`;
  }

  if ("error" in amount || errors.reason) return { ok: false, errors };
  return { ok: true, amount: amount.amount, reason };
}

export type IncomeInput = { source: string; amount: string; description: string };
export type IncomeErrors = { source?: string; amount?: string; description?: string };

export const MAX_SOURCE_LENGTH = 120;
export const MAX_DESCRIPTION_LENGTH = 500;

// The description is optional; an empty one is stored as null.
export function parseIncome(input: IncomeInput):
  | { ok: true; source: string; amount: string; description: string | null }
  | { ok: false; errors: IncomeErrors } {
  const errors: IncomeErrors = {};
  const source = input.source.trim();
  const description = input.description.trim();
  const amount = parseAmount(input.amount);
  if ("error" in amount) errors.amount = amount.error;

  if (source.length < 2) errors.source = "Andika pesa zimetoka wapi.";
  else if (source.length > MAX_SOURCE_LENGTH) errors.source = `Chanzo kisizidi herufi ${MAX_SOURCE_LENGTH}.`;
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Maelezo yasizidi herufi ${MAX_DESCRIPTION_LENGTH}.`;
  }

  if ("error" in amount || errors.source || errors.description) return { ok: false, errors };
  return { ok: true, source, amount: amount.amount, description: description || null };
}

// "t 103-abe" -> "T103ABE". Plates are stored and compared in this form.
export const normalizePlate = (plate: string) => plate.toUpperCase().replace(/[^A-Z0-9]/g, "");

export function checkPlate(plate: string): string | undefined {
  if (plate.length < 2 || plate.length > 10) return "Andika namba ya gari, mfano T103ABE.";
}

export const MIN_PASSWORD_LENGTH = 6;

export function checkNewPassword(password: string): string | undefined {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Nenosiri liwe na herufi ${MIN_PASSWORD_LENGTH} au zaidi.`;
  }
}
