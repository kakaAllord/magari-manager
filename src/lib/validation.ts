// Pure validation, kept free of server imports so it can be unit tested with node --test.

export type RequestInput = { amount: string; reason: string };
export type RequestErrors = { amount?: string; reason?: string };

const MAX_AMOUNT = 99_999_999.99; // numeric(10, 2)
export const MAX_REASON_LENGTH = 500;

export function parseMoneyRequest(input: RequestInput):
  | { ok: true; amount: string; reason: string }
  | { ok: false; errors: RequestErrors } {
  const errors: RequestErrors = {};
  const rawAmount = input.amount.trim();
  const reason = input.reason.trim();

  if (!/^\d+(\.\d{1,2})?$/.test(rawAmount)) {
    errors.amount = "Enter an amount like 25 or 25.50.";
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
  return { ok: true, amount: Number(rawAmount).toFixed(2), reason };
}
