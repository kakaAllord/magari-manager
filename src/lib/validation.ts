// Pure validation, kept free of server imports so it can be unit tested with node --test.

export type RequestInput = { amount: string; reason: string };
export type RequestErrors = { amount?: string; reason?: string };

// Whole Tanzanian shillings; the numeric(10, 2) column tops out just under 100M.
const MAX_AMOUNT = 99_999_999;
export const MAX_REASON_LENGTH = 500;

export function parseMoneyRequest(input: RequestInput):
  | { ok: true; amount: string; reason: string }
  | { ok: false; errors: RequestErrors } {
  const errors: RequestErrors = {};
  // Accept "40000" or "40,000"; commas only as thousands separators.
  const typed = input.amount.trim();
  const rawAmount = /^\d{1,3}(,\d{3})+$/.test(typed) ? typed.replaceAll(",", "") : typed;
  const reason = input.reason.trim();

  if (!/^\d+$/.test(rawAmount)) {
    errors.amount = "Andika kiasi kamili cha shilingi, mfano 40000 au 40,000.";
  } else if (Number(rawAmount) <= 0) {
    errors.amount = "Kiasi lazima kiwe zaidi ya sifuri.";
  } else if (Number(rawAmount) > MAX_AMOUNT) {
    errors.amount = "Kiasi ni kikubwa mno.";
  }

  if (reason.length < 3) errors.reason = "Mweleze meneja pesa ni za nini.";
  else if (reason.length > MAX_REASON_LENGTH) {
    errors.reason = `Sababu isizidi herufi ${MAX_REASON_LENGTH}.`;
  }

  if (errors.amount || errors.reason) return { ok: false, errors };
  return { ok: true, amount: String(Number(rawAmount)), reason };
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
