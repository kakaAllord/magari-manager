// Pure validation, kept free of server imports so it can be unit tested with node --test.

import { sw, type Tr } from "./i18n.ts";
import {
  PAYMENT_METHODS,
  SUPPORTING_DOCUMENTS,
  type PaymentMethod,
  type SupportingDocument,
} from "./voucher-fields.ts";

export type RequestInput = { amount: string; reason: string };
export type RequestErrors = { amount?: string; reason?: string };

// Whole Tanzanian shillings; the numeric(10, 2) column tops out just under 100M.
const MAX_AMOUNT = 99_999_999;
export const MAX_REASON_LENGTH = 500;

// Accepts "40000" or "40,000" (commas only as thousands separators).
function parseAmount(input: string, t: Tr = sw): { amount: string } | { error: string } {
  const typed = input.trim();
  const raw = /^\d{1,3}(,\d{3})+$/.test(typed) ? typed.replaceAll(",", "") : typed;
  if (!/^\d+$/.test(raw)) return { error: t("Andika kiasi kamili cha shilingi, mfano 40000 au 40,000.", "Write a whole number of shillings, e.g. 40000 or 40,000.") };
  if (Number(raw) <= 0) return { error: t("Kiasi lazima kiwe zaidi ya sifuri.", "The amount must be more than zero.") };
  if (Number(raw) > MAX_AMOUNT) return { error: t("Kiasi ni kikubwa mno.", "The amount is too large.") };
  return { amount: String(Number(raw)) };
}

export function parseMoneyRequest(input: RequestInput, t: Tr = sw):
  | { ok: true; amount: string; reason: string }
  | { ok: false; errors: RequestErrors } {
  const errors: RequestErrors = {};
  const amount = parseAmount(input.amount, t);
  if ("error" in amount) errors.amount = amount.error;

  const reason = input.reason.trim();
  if (reason.length < 3) errors.reason = t("Mweleze logistics manager pesa ni za nini.", "Tell the logistics manager what the money is for.");
  else if (reason.length > MAX_REASON_LENGTH) {
    errors.reason = t(`Sababu isizidi herufi ${MAX_REASON_LENGTH}.`, `The reason can be at most ${MAX_REASON_LENGTH} characters.`);
  }

  if ("error" in amount || errors.reason) return { ok: false, errors };
  return { ok: true, amount: amount.amount, reason };
}

export const MAX_CUSTOMER_LENGTH = 120;

// Income the client paid only part of: who the client is and how much they paid now, from 0 (all of
// it is owed) up to less than the job's total. Paying the whole total is "Amelipa yote" instead.
export function parsePartPayment(
  paidInput: string,
  customerInput: string,
  total: number,
  t: Tr = sw,
): { paid: number; customer: string } | { errors: { paid?: string; customer?: string } } {
  const errors: { paid?: string; customer?: string } = {};
  const customer = customerInput.trim().replace(/\s+/g, " ");
  if (customer.length < 2) errors.customer = t("Andika jina la mteja anayedaiwa.", "Write the name of the client who owes.");
  else if (customer.length > MAX_CUSTOMER_LENGTH) errors.customer = t(`Jina lisizidi herufi ${MAX_CUSTOMER_LENGTH}.`, `The name can be at most ${MAX_CUSTOMER_LENGTH} characters.`);

  const typed = paidInput.trim();
  const paid = /^0+$/.test(typed) ? { amount: "0" } : parseAmount(typed, t);
  if (!typed) errors.paid = t("Andika kiasi alicholipa sasa, au 0 kama hajalipa chochote.", "Write what they paid now, or 0 if they paid nothing.");
  else if ("error" in paid) errors.paid = paid.error;
  else if (Number(paid.amount) >= total) errors.paid = t("Amelipa jumla yote: chagua “Amelipa yote”.", "They paid the whole total: choose “Paid in full”.");

  if (errors.paid || errors.customer || "error" in paid) return { errors };
  return { paid: Number(paid.amount), customer };
}

// A payment towards a debt: more than nothing and no more than what is still owed.
export function parseDebtPayment(input: string, owed: number, t: Tr = sw): { amount: number } | { error: string } {
  const amount = parseAmount(input, t);
  if ("error" in amount) return amount;
  if (Number(amount.amount) > owed) return { error: t(`Ni zaidi ya deni lililobaki, TSh ${owed.toLocaleString("en")}.`, `That is more than the debt left, TSh ${owed.toLocaleString("en")}.`) };
  return { amount: Number(amount.amount) };
}

// A manager's own request names the car it's for, or "none" for costs that aren't a car's.
export function parseCarChoice(input: string, t: Tr = sw): { carId: number | null } | { error: string } {
  if (input === "none") return { carId: null };
  const carId = Number(input);
  if (!input || !Number.isInteger(carId) || carId <= 0) return { error: t("Chagua gari, au “Bila gari”.", "Pick a car, or “No car”.") };
  return { carId };
}

export type IncomeInput = { carId: string; amount: string; description: string };
export type IncomeErrors = { carId?: string; amount?: string; description?: string };

export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_ISSUE_NOTE_LENGTH = 120;

// The car comes from a selector, so only its id is checked here; the action confirms it exists.
// The description is optional; an empty one is stored as null.
export function parseIncome(input: IncomeInput, t: Tr = sw):
  | { ok: true; carId: number; amount: string; description: string | null }
  | { ok: false; errors: IncomeErrors } {
  const errors: IncomeErrors = {};
  const carId = Number(input.carId);
  const description = input.description.trim();
  const amount = parseAmount(input.amount, t);
  if ("error" in amount) errors.amount = amount.error;

  if (!input.carId || !Number.isInteger(carId) || carId <= 0) errors.carId = t("Chagua gari lililoleta mapato.", "Pick the car that brought the income.");
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = t(`Maelezo yasizidi herufi ${MAX_DESCRIPTION_LENGTH}.`, `The description can be at most ${MAX_DESCRIPTION_LENGTH} characters.`);
  }

  if ("error" in amount || errors.carId || errors.description) return { ok: false, errors };
  return { ok: true, carId, amount: amount.amount, description: description || null };
}

// "t 103-abe" -> "T103ABE". Plates are stored and compared in this form.
export const normalizePlate = (plate: string) => plate.toUpperCase().replace(/[^A-Z0-9]/g, "");

export function checkPlate(plate: string, t: Tr = sw): string | undefined {
  if (plate.length < 2 || plate.length > 10) return t("Andika namba ya gari, mfano T103ABE.", "Write the car's plate, e.g. T103ABE.");
}

// Deliberately loose: one @ with something on both sides and a dot in the domain.
export function checkEmail(email: string, t: Tr = sw): string | undefined {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return t("Andika barua pepe sahihi, mfano jina@kampuni.co.tz.", "Write a valid email, e.g. name@company.co.tz.");
}

export const MIN_PASSWORD_LENGTH = 6;

export function checkNewPassword(password: string, t: Tr = sw): string | undefined {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return t(`Nenosiri liwe na herufi ${MIN_PASSWORD_LENGTH} au zaidi.`, `The password needs ${MIN_PASSWORD_LENGTH} or more characters.`);
  }
}

export type ReadingInput = { odometer: string; gauge: string };
export type ReadingErrors = { odometer?: string; gauge?: string };

const MAX_ODOMETER = 9_999_999;

// An odometer as typed ("45500" or "45,500") and a gauge mark in eighths of a tank (0 to 8).
export function parseReading(input: ReadingInput, t: Tr = sw):
  | { ok: true; odometer: number; eighths: number }
  | { ok: false; errors: ReadingErrors } {
  const errors: ReadingErrors = {};
  const typed = input.odometer.trim();
  const raw = /^\d{1,3}(,\d{3})+$/.test(typed) ? typed.replaceAll(",", "") : typed;
  const odometer = Number(raw);
  if (!/^\d+$/.test(raw) || odometer > MAX_ODOMETER) {
    errors.odometer = t("Andika kilomita zinazoonekana kwenye gari, mfano 45,500.", "Write the kilometres shown on the car, e.g. 45,500.");
  }
  const eighths = Number(input.gauge);
  if (input.gauge === "" || !Number.isInteger(eighths) || eighths < 0 || eighths > 8) {
    errors.gauge = t("Chagua mafuta yaliyopo kwenye geji.", "Pick the fuel level on the gauge.");
  }
  if (errors.odometer || errors.gauge) return { ok: false, errors };
  return { ok: true, odometer, eighths };
}

// A driver's reading may not jump this far past the car's last one; a typo is likelier than the trip.
export const MAX_KM_BETWEEN_READINGS = 3_000;

// Compares a new odometer with the car's last reading. Undefined means it's fine.
export function checkOdometer(odometer: number, last: number | null, capJump: boolean, t: Tr = sw): string | undefined {
  if (last === null) return;
  if (odometer < last) {
    return t(`Kilomita haziwezi kuwa chini ya kipimo cha mwisho (${last.toLocaleString("en")}). Angalia tena.`, `The kilometres can't be below the last reading (${last.toLocaleString("en")}). Check again.`);
  }
  if (capJump && odometer - last > MAX_KM_BETWEEN_READINGS) {
    return t(`Ni zaidi ya km ${MAX_KM_BETWEEN_READINGS.toLocaleString("en")} tangu kipimo cha mwisho (${last.toLocaleString("en")}). Hakikisha umeandika sawa, au mwambie logistics manager.`, `That is more than ${MAX_KM_BETWEEN_READINGS.toLocaleString("en")} km since the last reading (${last.toLocaleString("en")}). Make sure it's right, or tell the logistics manager.`);
  }
}

export function parsePricePerLitre(input: string, t: Tr = sw): { price: number } | { error: string } {
  const amount = parseAmount(input, t);
  if ("error" in amount) return amount;
  const price = Number(amount.amount);
  if (price > 100_000) return { error: t("Bei ya lita moja ni kubwa mno.", "The price per litre is too high.") };
  return { price };
}

// The price per litre typed with each fuel request, since it differs from one station to the next.
// Under TSh 500 is almost certainly a slip (e.g. "3" for 3,000).
export function parseFuelPrice(input: string, t: Tr = sw): { price: number } | { error: string } {
  if (!input.trim()) return { error: t("Andika bei ya lita moja kwenye kituo cha mafuta.", "Write the station's price for one litre.") };
  const parsed = parsePricePerLitre(input, t);
  // A too-high price keeps its own message; any other slip gets the example.
  const digits = input.trim().replaceAll(",", "");
  if ("error" in parsed) return /^\d+$/.test(digits) && Number(digits) > 100_000 ? parsed : { error: t("Andika bei ya lita moja kwa namba, mfano 3,000.", "Write the price per litre as a number, e.g. 3,000.") };
  if (parsed.price < 500) return { error: t("Bei ya lita moja ni ndogo mno. Andika kwa shilingi, mfano 3,000.", "The price per litre is too low. Write it in shillings, e.g. 3,000.") };
  return parsed;
}

// A quantity whole or with up to two decimals: "20", "20.5", "20,5" or "1,250.5". Null when it isn't one.
function parseDecimal(input: string): number | null {
  const typed = input.trim().replace(/\s/g, "");
  const raw = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(typed) ? typed.replaceAll(",", "") : typed.replace(",", ".");
  return /^\d+(\.\d{1,2})?$/.test(raw) ? Number(raw) : null;
}

// How many litres a fuel request asks for: whole or with up to two decimals, "20.5" or "20,5".
export function parseLitres(input: string, t: Tr = sw): { litres: number } | { error: string } {
  if (!input.trim()) return { error: t("Andika lita ngapi unahitaji.", "Write how many litres you need.") };
  const litres = parseDecimal(input);
  if (litres === null) return { error: t("Andika lita kwa namba, mfano 20 au 20.5.", "Write the litres as a number, e.g. 20 or 20.5.") };
  if (litres <= 0) return { error: t("Lita lazima ziwe zaidi ya sifuri.", "The litres must be more than zero.") };
  if (litres > 2000) return { error: t("Lita ni nyingi mno kwa ombi moja.", "That is too many litres for one request.") };
  return { litres };
}

export const MAX_DESTINATION_LENGTH = 120;

// Cargo is priced by the tonne or by the kilo; the meneja picks which and types the price and the
// quantity in it, either with up to two decimals. The amount is their product in whole shillings.
// What's kept is always in tonnes, `unit` saying how it was typed: 250 kg at TSh 52.25 a kilo is
// 0.25 t at TSh 52,250. Under TSh 100 a tonne or TSh 1 a kilo is almost certainly a slip.
export type CargoUnit = "tonne" | "kg";
export const cargoUnit = (input: string): CargoUnit => (input === "kg" ? "kg" : "tonne");

const CARGO_WORDS = (t: Tr) => ({
  tonne: { name: t("tani", "tonne"), names: t("tani", "tonnes"), min: 100, maxRate: MAX_AMOUNT, maxQuantity: 10_000, rate: "45,000", quantity: t("30 au 28.5", "30 or 28.5") },
  kg: { name: t("kilo", "kilo"), names: t("kilo", "kilos"), min: 1, maxRate: 100_000, maxQuantity: 10_000_000, rate: t("52 au 52.5", "52 or 52.5"), quantity: t("1,250 au 1,250.5", "1,250 or 1,250.5") },
});

// Price × quantity in whole shillings, worked out in hundredths so floating point can't tip a half
// shilling the wrong way. Both have at most two decimals.
const cargoAmount = (price: number, quantity: number) => Math.round((Math.round(price * 100) * Math.round(quantity * 100)) / 10_000);

export function parseCargo(
  rateInput: string,
  quantityInput: string,
  unit: CargoUnit,
  destinationInput: string,
  t: Tr = sw,
):
  | { unit: CargoUnit; tonnes: number; ratePerTonne: number; amount: number; destination: string | null }
  | { errors: { rate?: string; quantity?: string; destination?: string } } {
  const errors: { rate?: string; quantity?: string; destination?: string } = {};
  const w = CARGO_WORDS(t)[unit];
  const Names = w.names[0].toUpperCase() + w.names.slice(1);
  const rate = parseDecimal(rateInput);
  if (!rateInput.trim()) errors.rate = t(`Andika bei kwa ${w.name} moja.`, `Write the price for one ${w.name}.`);
  else if (rate === null) errors.rate = t(`Andika bei kwa namba, mfano ${w.rate}.`, `Write the price as a number, e.g. ${w.rate}.`);
  else if (rate < w.min) errors.rate = t(`Bei kwa ${w.name} ni ndogo mno. Andika kwa shilingi, mfano ${w.rate}.`, `The price per ${w.name} is too low. Write it in shillings, e.g. ${w.rate}.`);
  else if (rate > w.maxRate) errors.rate = t(`Bei kwa ${w.name} ni kubwa mno.`, `The price per ${w.name} is too high.`);

  const quantity = parseDecimal(quantityInput);
  if (!quantityInput.trim()) errors.quantity = t(`Andika ${w.names} ngapi zimebebwa.`, `Write how many ${w.names} were carried.`);
  else if (quantity === null) errors.quantity = t(`Andika ${w.names} kwa namba, mfano ${w.quantity}.`, `Write the ${w.names} as a number, e.g. ${w.quantity}.`);
  else if (quantity <= 0) errors.quantity = t(`${Names} lazima ziwe zaidi ya sifuri.`, `${Names} must be more than zero.`);
  else if (quantity > w.maxQuantity) errors.quantity = t(`${Names} ni nyingi mno kwa rekodi moja.`, `That is too many ${w.names} for one record.`);

  const destination = destinationInput.trim();
  if (destination.length > MAX_DESTINATION_LENGTH) errors.destination = t(`Isizidi herufi ${MAX_DESTINATION_LENGTH}.`, `At most ${MAX_DESTINATION_LENGTH} characters.`);

  if (errors.rate || errors.quantity || errors.destination || rate === null || quantity === null) return { errors };
  const amount = cargoAmount(rate, quantity);
  if (amount > MAX_AMOUNT) return { errors: { quantity: t("Jumla ni kubwa mno. Gawa kwenye rekodi mbili.", "The total is too large. Split it into two records.") } };
  if (amount <= 0) return { errors: { quantity: t("Jumla ni chini ya shilingi moja.", "The total is under one shilling.") } };
  const kg = unit === "kg";
  return {
    unit,
    tonnes: kg ? Number((quantity / 1000).toFixed(5)) : quantity,
    ratePerTonne: kg ? Number((rate * 1000).toFixed(2)) : rate,
    amount,
    destination: destination || null,
  };
}

// A fuel request gives the price per litre and the litres; the amount is their product, in whole
// shillings. Errors are keyed by the field that caused them.
export function parseFuelOrder(
  priceInput: string,
  litresInput: string,
  t: Tr = sw,
): { price: number; litres: number; amount: number } | { errors: { fuelPrice?: string; litres?: string } } {
  const price = parseFuelPrice(priceInput, t);
  const litres = parseLitres(litresInput, t);
  const errors = { ...("error" in price ? { fuelPrice: price.error } : {}), ...("error" in litres ? { litres: litres.error } : {}) };
  if ("error" in price || "error" in litres) return { errors };
  const amount = Math.round(price.price * litres.litres);
  if (amount > MAX_AMOUNT) return { errors: { litres: t("Kiasi ni kikubwa mno. Punguza lita.", "The amount is too large. Use fewer litres.") } };
  return { price: price.price, litres: litres.litres, amount };
}

export function parseTankLitres(input: string, t: Tr = sw): { litres: number } | { error: string } {
  const litres = Number(input.trim());
  if (!/^\d+$/.test(input.trim()) || litres < 10 || litres > 1000) {
    return { error: t("Andika lita za tanki, kati ya 10 na 1000.", "Write the tank's litres, between 10 and 1000.") };
  }
  return { litres };
}

// A receipt photo, shrunk in the browser to stay under the 1 MB server action limit.
// The type comes from the file's first bytes, never from what the browser claims.
export const MAX_RECEIPT_BYTES = 900_000;

export function checkReceiptImage(bytes: Uint8Array, t: Tr = sw): { contentType: string } | { error: string } {
  if (bytes.length === 0) return { error: t("Chagua picha ya risiti.", "Pick a photo of the receipt.") };
  if (bytes.length > MAX_RECEIPT_BYTES) return { error: t("Picha ni kubwa mno. Jaribu tena au piga picha nyingine.", "The photo is too large. Try again or take another photo.") };
  const starts = (sig: number[], at = 0) => sig.every((b, i) => bytes[at + i] === b);
  if (starts([0xff, 0xd8, 0xff])) return { contentType: "image/jpeg" };
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { contentType: "image/png" };
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return { contentType: "image/webp" };
  return { error: t("Faili hili si picha. Weka picha ya risiti (JPG, PNG au WebP).", "This file isn't a photo. Add a photo of the receipt (JPG, PNG or WebP).") };
}

// A manager may date an expense or income entry in the past to type in history. Today (in
// Tanzania) or empty means "now"; the future is refused.
export const EARLIEST_ENTRY_DATE = "2015-01-01";

// "YYYY-MM-DD" naming a day that exists. Date rolls 30 Feb over to March and gives up on 32 Jan,
// so a real date reads back unchanged.
function isRealDate(typed: string) {
  const parsed = new Date(`${typed}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(typed) && !isNaN(parsed.getTime()) && parsed.toISOString().startsWith(typed);
}

export function parseEntryDate(input: string, today: string, t: Tr = sw): { date: string | null } | { error: string } {
  const typed = input.trim();
  if (!typed || typed === today) return { date: null };
  if (!isRealDate(typed)) return { error: t("Chagua tarehe sahihi.", "Pick a valid date.") };
  if (typed > today) return { error: t("Tarehe haiwezi kuwa ya baadaye.", "The date can't be in the future.") };
  if (typed < EARLIEST_ENTRY_DATE) return { error: t("Tarehe ni ya zamani mno.", "The date is too far back.") };
  return { date: typed };
}

// A new car's starting reading is optional, but km and gauge go together: both or neither.
export function parseStartingReading(input: ReadingInput, t: Tr = sw):
  | { ok: true; reading: { odometer: number; eighths: number } | null }
  | { ok: false; errors: ReadingErrors } {
  if (!input.odometer.trim() && input.gauge === "") return { ok: true, reading: null };
  const parsed = parseReading(input, t);
  if (!parsed.ok) return parsed;
  return { ok: true, reading: { odometer: parsed.odometer, eighths: parsed.eighths } };
}

// A driver's maoni: a few words at least, at most a long paragraph.
export const MAX_FEEDBACK_LENGTH = 1000;

export function parseFeedback(input: string, t: Tr = sw): { body: string } | { error: string } {
  const body = input.trim();
  if (body.length < 3) return { error: t("Andika maoni yako kwanza.", "Write your feedback first.") };
  if (body.length > MAX_FEEDBACK_LENGTH) return { error: t(`Maoni yasizidi herufi ${MAX_FEEDBACK_LENGTH}.`, `Feedback can be at most ${MAX_FEEDBACK_LENGTH} characters.`) };
  return { body };
}

// Why an invoice is being cancelled: required, so whoever reads it later knows.
export const MAX_CANCEL_REASON_LENGTH = 300;
export function parseCancelReason(input: string, t: Tr = sw): { reason: string } | { error: string } {
  const reason = input.trim();
  if (reason.length < 3) return { error: t("Andika sababu ya kufuta invoice hii.", "Write why this invoice is being cancelled.") };
  if (reason.length > MAX_CANCEL_REASON_LENGTH) {
    return { error: t(`Sababu isizidi herufi ${MAX_CANCEL_REASON_LENGTH}.`, `The reason can be at most ${MAX_CANCEL_REASON_LENGTH} characters.`) };
  }
  return { reason };
}

// An invoice: the customer, its dates, the bank to pay into, and up to 20 trips, each priced per
// tonne or per kilo. Lines left completely empty are skipped. Errors on a line are keyed by its index as sent.
export const MAX_INVOICE_LINES = 20;
export const MAX_INVOICE_TEXT = 500;
export const BANK_LIMITS = { name: 80, accountNumber: 40, accountName: 120, swift: 20, purpose: 160 } as const;

export type InvoiceBankInput = { name: string; accountNumber: string; accountName: string; swift: string; purpose: string };
export type InvoiceBank = { name: string; accountNumber: string; accountName: string; swift: string | null; purpose: string | null };
export type InvoiceLineInput = { description: string; plate: string; quantity: string; unit: CargoUnit; rate: string };
export type InvoiceInput = {
  customer: string;
  contact: string;
  issuedOn: string;
  dueOn: string;
  // A page opened before the bank fields existed sends free-text payment details and no bank;
  // it is saved the old way, without a bank or a due date, rather than failing on fields it can't show.
  bank: InvoiceBankInput | null;
  payment: string;
  lines: InvoiceLineInput[];
};
export type InvoiceLineErrors = { description?: string; quantity?: string; rate?: string };
export type InvoiceErrors = {
  customer?: string;
  contact?: string;
  issuedOn?: string;
  dueOn?: string;
  payment?: string;
  bank?: Partial<Record<keyof InvoiceBankInput, string>>;
  lines?: string;
  line?: Record<number, InvoiceLineErrors>;
};
export type InvoiceLine = {
  description: string;
  plate: string | null;
  unit: CargoUnit;
  tonnes: number;
  ratePerTonne: number;
  amount: number;
};
export type Invoice = {
  customer: string;
  contact: string | null;
  issuedOn: string;
  dueOn: string | null;
  bank: InvoiceBank | null;
  payment: string | null;
  lines: InvoiceLine[];
  total: number;
};

// The bank block: the bank, account number and account name are needed, the SWIFT code and purpose are not.
function parseBank(input: InvoiceBankInput, t: Tr) {
  const v = {
    name: input.name.trim(),
    accountNumber: input.accountNumber.trim(),
    accountName: input.accountName.trim(),
    swift: input.swift.trim().toUpperCase(),
    purpose: input.purpose.trim(),
  };
  const errors: NonNullable<InvoiceErrors["bank"]> = {};
  if (!v.name) errors.name = t("Andika jina la benki.", "Write the bank's name.");
  if (!v.accountNumber) errors.accountNumber = t("Andika namba ya akaunti.", "Write the account number.");
  if (!v.accountName) errors.accountName = t("Andika jina la akaunti.", "Write the account name.");
  for (const key of Object.keys(BANK_LIMITS) as (keyof InvoiceBankInput)[]) {
    if (v[key].length > BANK_LIMITS[key]) errors[key] = t(`Isizidi herufi ${BANK_LIMITS[key]}.`, `At most ${BANK_LIMITS[key]} characters.`);
  }
  const bank: InvoiceBank = { ...v, swift: v.swift || null, purpose: v.purpose || null };
  return { bank, errors };
}

export function parseInvoice(input: InvoiceInput, today: string, t: Tr = sw): { ok: true; invoice: Invoice } | { ok: false; errors: InvoiceErrors } {
  const errors: InvoiceErrors = {};
  const customer = input.customer.trim();
  if (customer.length < 2) errors.customer = t("Andika jina la mteja.", "Write the client's name.");
  else if (customer.length > 120) errors.customer = t("Jina la mteja lisizidi herufi 120.", "The client's name can be at most 120 characters.");
  const contact = input.contact.trim();
  if (contact.length > MAX_INVOICE_TEXT) errors.contact = t(`Yasizidi herufi ${MAX_INVOICE_TEXT}.`, `At most ${MAX_INVOICE_TEXT} characters.`);
  const payment = input.payment.trim();
  if (payment.length > MAX_INVOICE_TEXT) errors.payment = t(`Yasizidi herufi ${MAX_INVOICE_TEXT}.`, `At most ${MAX_INVOICE_TEXT} characters.`);

  const issuedOn = input.issuedOn.trim();
  if (!isRealDate(issuedOn)) errors.issuedOn = t("Chagua tarehe ya invoice.", "Pick the invoice date.");
  else if (issuedOn > today) errors.issuedOn = t("Tarehe ya invoice haiwezi kuwa ya baadaye.", "The invoice date can't be in the future.");
  else if (issuedOn < EARLIEST_ENTRY_DATE) errors.issuedOn = t("Tarehe ni ya zamani mno.", "The date is too far back.");
  const dueOn = input.dueOn.trim();
  if (!dueOn && input.bank) errors.dueOn = t("Chagua mwisho wa kulipa.", "Pick the due date.");
  else if (dueOn && !isRealDate(dueOn)) errors.dueOn = t("Chagua tarehe sahihi.", "Pick a valid date.");
  else if (dueOn && !errors.issuedOn && dueOn < issuedOn) errors.dueOn = t("Mwisho wa kulipa hauwezi kuwa kabla ya tarehe ya invoice.", "The due date can't be before the invoice date.");
  const bank = input.bank && parseBank(input.bank, t);
  if (bank && Object.keys(bank.errors).length) errors.bank = bank.errors;

  const lines: InvoiceLine[] = [];
  const lineErrors: Record<number, InvoiceLineErrors> = {};
  input.lines.forEach((l, i) => {
    if (![l.description, l.plate, l.quantity, l.rate].some((v) => v.trim())) return;
    const e: InvoiceLineErrors = {};
    const description = l.description.trim();
    if (description.length < 2) e.description = t("Andika safari, mfano Dar es Salaam - Mwanza.", "Write the trip, e.g. Dar es Salaam - Mwanza.");
    else if (description.length > 160) e.description = t("Isizidi herufi 160.", "At most 160 characters.");
    const cargo = parseCargo(l.rate, l.quantity, l.unit, "", t);
    if ("errors" in cargo) Object.assign(e, { rate: cargo.errors.rate, quantity: cargo.errors.quantity });
    if (e.description || e.rate || e.quantity) lineErrors[i] = e;
    else if ("amount" in cargo) {
      const { unit, tonnes, ratePerTonne, amount } = cargo;
      lines.push({ description, plate: normalizePlate(l.plate) || null, unit, tonnes, ratePerTonne, amount });
    }
  });
  if (Object.keys(lineErrors).length) errors.line = lineErrors;
  else if (lines.length === 0) errors.lines = t("Ongeza angalau safari moja.", "Add at least one trip.");
  else if (lines.length > MAX_INVOICE_LINES) errors.lines = t(`Invoice moja isizidi safari ${MAX_INVOICE_LINES}.`, `One invoice can have at most ${MAX_INVOICE_LINES} trips.`);

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    invoice: {
      customer,
      contact: contact || null,
      issuedOn,
      dueOn: dueOn || null,
      bank: bank?.bank ?? null,
      payment: payment || null,
      lines,
      total: lines.reduce((sum, l) => sum + l.amount, 0),
    },
  };
}

// A request's optional breakdown (mchanganuo), as the voucher's detailed expenditure: up to 10
// lines of description, quantity (up to two decimals) and unit price (whole shillings, with commas).
// Lines left completely empty are skipped; none at all means no breakdown. When there is one, the
// request's amount is the sum of its lines, worked out here. Errors are keyed by the line as sent.
export const MAX_EXPENSE_ITEMS = 10;
export const MAX_ITEM_DESCRIPTION = 120;

export type ExpenseItemInput = { description: string; quantity: string; unitPrice: string };
export type ExpenseItem = { description: string; quantity: number; unitPrice: number; amount: number };
export type ExpenseItemErrors = { description?: string; quantity?: string; unitPrice?: string };

export function parseExpenseItems(
  input: ExpenseItemInput[],
  t: Tr = sw,
): { ok: true; items: ExpenseItem[]; total: number } | { ok: false; errors: Record<number, ExpenseItemErrors>; message?: string } {
  const items: ExpenseItem[] = [];
  const errors: Record<number, ExpenseItemErrors> = {};
  input.forEach((line, i) => {
    if (![line.description, line.quantity, line.unitPrice].some((v) => v.trim())) return;
    const e: ExpenseItemErrors = {};
    const description = line.description.trim();
    if (description.length < 2) e.description = t("Andika ni nini.", "Write what it is.");
    else if (description.length > MAX_ITEM_DESCRIPTION) e.description = t(`Isizidi herufi ${MAX_ITEM_DESCRIPTION}.`, `At most ${MAX_ITEM_DESCRIPTION} characters.`);
    const quantity = parseDecimal(line.quantity);
    if (!line.quantity.trim()) e.quantity = t("Idadi?", "Quantity?");
    else if (quantity === null || quantity <= 0) e.quantity = t("Andika idadi, mfano 2 au 1.5.", "Write the quantity, e.g. 2 or 1.5.");
    else if (quantity > 100_000) e.quantity = t("Idadi ni kubwa mno.", "The quantity is too large.");
    const price = parseAmount(line.unitPrice, t);
    if (!line.unitPrice.trim()) e.unitPrice = t("Bei ya kimoja?", "Price each?");
    else if ("error" in price) e.unitPrice = price.error;
    if (e.description || e.quantity || e.unitPrice || quantity === null || "error" in price) {
      errors[i] = e;
      return;
    }
    const unitPrice = Number(price.amount);
    items.push({ description, quantity, unitPrice, amount: Math.round((Math.round(quantity * 100) * unitPrice) / 100) });
  });
  if (Object.keys(errors).length) return { ok: false, errors };
  if (items.length > MAX_EXPENSE_ITEMS) return { ok: false, errors: {}, message: t(`Mchanganuo usizidi mistari ${MAX_EXPENSE_ITEMS}.`, `The breakdown can have at most ${MAX_EXPENSE_ITEMS} lines.`) };
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  if (total > MAX_AMOUNT) return { ok: false, errors: {}, message: t("Jumla ya mchanganuo ni kubwa mno.", "The breakdown's total is too large.") };
  return { ok: true, items, total };
}

// How the mhasibu paid, for the voucher: the method is needed, and so is a reference number for
// anything but cash. Supporting documents are optional ticks; "Nyingine" can say what it was.
export type PaymentInput = { method: string; reference: string; documents: string[]; other: string };
export type PaymentErrors = { method?: string; reference?: string; other?: string };
export const MAX_SUPPORTING_OTHER = 80;

export function parsePayment(input: PaymentInput, t: Tr = sw):
  | { ok: true; method: PaymentMethod; reference: string | null; documents: SupportingDocument[]; other: string | null }
  | { ok: false; errors: PaymentErrors } {
  const errors: PaymentErrors = {};
  const method = PAYMENT_METHODS.find((m) => m.key === input.method)?.key;
  if (!method) errors.method = t("Chagua njia ya malipo.", "Pick how it was paid.");
  const reference = input.reference.trim();
  if (method && method !== "cash" && !reference) errors.reference = t("Andika namba ya kumbukumbu ya malipo haya.", "Write this payment's reference number.");
  else if (reference.length > MAX_ISSUE_NOTE_LENGTH) errors.reference = t(`Isizidi herufi ${MAX_ISSUE_NOTE_LENGTH}.`, `At most ${MAX_ISSUE_NOTE_LENGTH} characters.`);
  const documents = SUPPORTING_DOCUMENTS.map((d) => d.key).filter((key) => input.documents.includes(key));
  const other = documents.includes("other") ? input.other.trim() : "";
  if (other.length > MAX_SUPPORTING_OTHER) errors.other = t(`Isizidi herufi ${MAX_SUPPORTING_OTHER}.`, `At most ${MAX_SUPPORTING_OTHER} characters.`);
  if (!method || Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, method, reference: reference || null, documents, other: other || null };
}
