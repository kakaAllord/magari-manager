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
    errors.amount = "Enter a whole number of shillings, like 40000 or 40,000.";
  } else if (Number(rawAmount) <= 0) {
    errors.amount = "Amount must be more than zero.";
  } else if (Number(rawAmount) > MAX_AMOUNT) {
    errors.amount = "Amount is too large.";
  }

  if (reason.length < 3) errors.reason = "Tell the manager what the money is for.";
  else if (reason.length > MAX_REASON_LENGTH) {
    errors.reason = `Keep the reason under ${MAX_REASON_LENGTH} characters.`;
  }

  if (errors.amount || errors.reason) return { ok: false, errors };
  return { ok: true, amount: String(Number(rawAmount)), reason };
}
