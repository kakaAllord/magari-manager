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

// A manager's own request names the car it's for, or "none" for costs that aren't a car's.
export function parseCarChoice(input: string): { carId: number | null } | { error: string } {
  if (input === "none") return { carId: null };
  const carId = Number(input);
  if (!input || !Number.isInteger(carId) || carId <= 0) return { error: "Chagua gari, au “Bila gari”." };
  return { carId };
}

export type IncomeInput = { carId: string; amount: string; description: string };
export type IncomeErrors = { carId?: string; amount?: string; description?: string };

export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_ISSUE_NOTE_LENGTH = 120;

// The car comes from a selector, so only its id is checked here; the action confirms it exists.
// The description is optional; an empty one is stored as null.
export function parseIncome(input: IncomeInput):
  | { ok: true; carId: number; amount: string; description: string | null }
  | { ok: false; errors: IncomeErrors } {
  const errors: IncomeErrors = {};
  const carId = Number(input.carId);
  const description = input.description.trim();
  const amount = parseAmount(input.amount);
  if ("error" in amount) errors.amount = amount.error;

  if (!input.carId || !Number.isInteger(carId) || carId <= 0) errors.carId = "Chagua gari lililoleta mapato.";
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Maelezo yasizidi herufi ${MAX_DESCRIPTION_LENGTH}.`;
  }

  if ("error" in amount || errors.carId || errors.description) return { ok: false, errors };
  return { ok: true, carId, amount: amount.amount, description: description || null };
}

// "t 103-abe" -> "T103ABE". Plates are stored and compared in this form.
export const normalizePlate = (plate: string) => plate.toUpperCase().replace(/[^A-Z0-9]/g, "");

export function checkPlate(plate: string): string | undefined {
  if (plate.length < 2 || plate.length > 10) return "Andika namba ya gari, mfano T103ABE.";
}

// Deliberately loose: one @ with something on both sides and a dot in the domain.
export function checkEmail(email: string): string | undefined {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Andika barua pepe sahihi, mfano jina@kampuni.co.tz.";
}

export const MIN_PASSWORD_LENGTH = 6;

export function checkNewPassword(password: string): string | undefined {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Nenosiri liwe na herufi ${MIN_PASSWORD_LENGTH} au zaidi.`;
  }
}

export type ReadingInput = { odometer: string; gauge: string };
export type ReadingErrors = { odometer?: string; gauge?: string };

const MAX_ODOMETER = 9_999_999;

// An odometer as typed ("45500" or "45,500") and a gauge mark in eighths of a tank (0 to 8).
export function parseReading(input: ReadingInput):
  | { ok: true; odometer: number; eighths: number }
  | { ok: false; errors: ReadingErrors } {
  const errors: ReadingErrors = {};
  const typed = input.odometer.trim();
  const raw = /^\d{1,3}(,\d{3})+$/.test(typed) ? typed.replaceAll(",", "") : typed;
  const odometer = Number(raw);
  if (!/^\d+$/.test(raw) || odometer > MAX_ODOMETER) {
    errors.odometer = "Andika kilomita zinazoonekana kwenye gari, mfano 45,500.";
  }
  const eighths = Number(input.gauge);
  if (input.gauge === "" || !Number.isInteger(eighths) || eighths < 0 || eighths > 8) {
    errors.gauge = "Chagua mafuta yaliyopo kwenye geji.";
  }
  if (errors.odometer || errors.gauge) return { ok: false, errors };
  return { ok: true, odometer, eighths };
}

// A driver's reading may not jump this far past the car's last one; a typo is likelier than the trip.
export const MAX_KM_BETWEEN_READINGS = 3_000;

// Compares a new odometer with the car's last reading. Undefined means it's fine.
export function checkOdometer(odometer: number, last: number | null, capJump: boolean): string | undefined {
  if (last === null) return;
  if (odometer < last) {
    return `Kilomita haziwezi kuwa chini ya kipimo cha mwisho (${last.toLocaleString("en")}). Angalia tena.`;
  }
  if (capJump && odometer - last > MAX_KM_BETWEEN_READINGS) {
    return `Ni zaidi ya km ${MAX_KM_BETWEEN_READINGS.toLocaleString("en")} tangu kipimo cha mwisho (${last.toLocaleString("en")}). Hakikisha umeandika sawa, au mwambie meneja.`;
  }
}

export function parsePricePerLitre(input: string): { price: number } | { error: string } {
  const amount = parseAmount(input);
  if ("error" in amount) return amount;
  const price = Number(amount.amount);
  if (price > 100_000) return { error: "Bei ya lita moja ni kubwa mno." };
  return { price };
}

export function parseTankLitres(input: string): { litres: number } | { error: string } {
  const litres = Number(input.trim());
  if (!/^\d+$/.test(input.trim()) || litres < 10 || litres > 1000) {
    return { error: "Andika lita za tanki, kati ya 10 na 1000." };
  }
  return { litres };
}

// A receipt photo, shrunk in the browser to stay under the 1 MB server action limit.
// The type comes from the file's first bytes, never from what the browser claims.
export const MAX_RECEIPT_BYTES = 900_000;

export function checkReceiptImage(bytes: Uint8Array): { contentType: string } | { error: string } {
  if (bytes.length === 0) return { error: "Chagua picha ya risiti." };
  if (bytes.length > MAX_RECEIPT_BYTES) return { error: "Picha ni kubwa mno. Jaribu tena au piga picha nyingine." };
  const starts = (sig: number[], at = 0) => sig.every((b, i) => bytes[at + i] === b);
  if (starts([0xff, 0xd8, 0xff])) return { contentType: "image/jpeg" };
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { contentType: "image/png" };
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return { contentType: "image/webp" };
  return { error: "Faili hili si picha. Weka picha ya risiti (JPG, PNG au WebP)." };
}

// A manager may date an expense or income entry in the past to type in history. Today (in
// Tanzania) or empty means "now"; the future is refused.
export const EARLIEST_ENTRY_DATE = "2015-01-01";

export function parseEntryDate(input: string, today: string): { date: string | null } | { error: string } {
  const typed = input.trim();
  if (!typed || typed === today) return { date: null };
  // Date rolls 30 Feb over to March and gives up on 32 Jan, so a real date reads back unchanged.
  const parsed = new Date(`${typed}T00:00:00Z`);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(typed) && !isNaN(parsed.getTime()) && parsed.toISOString().startsWith(typed);
  if (!valid) return { error: "Chagua tarehe sahihi." };
  if (typed > today) return { error: "Tarehe haiwezi kuwa ya baadaye." };
  if (typed < EARLIEST_ENTRY_DATE) return { error: "Tarehe ni ya zamani mno." };
  return { date: typed };
}

// A new car's starting reading is optional, but km and gauge go together: both or neither.
export function parseStartingReading(input: ReadingInput):
  | { ok: true; reading: { odometer: number; eighths: number } | null }
  | { ok: false; errors: ReadingErrors } {
  if (!input.odometer.trim() && input.gauge === "") return { ok: true, reading: null };
  const parsed = parseReading(input);
  if (!parsed.ok) return parsed;
  return { ok: true, reading: { odometer: parsed.odometer, eighths: parsed.eighths } };
}
