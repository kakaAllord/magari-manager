import type { Tr } from "./i18n.ts";
// The fixed choices a payment voucher records, with the Swahili label the app shows and the English
// one the voucher prints (the company's voucher template is in English). Pure, for forms and PDFs.
// The keys are stored in money_requests (migration 026): add a choice there before adding it here.

export const PAYMENT_METHODS = [
  { key: "cash", sw: "Taslimu", en: "Cash" },
  { key: "mobile", sw: "Simu (M-Pesa n.k.)", en: "Mobile" },
  { key: "bank", sw: "Benki", en: "Bank" },
  { key: "cheque", sw: "Hundi", en: "Cheque" },
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["key"];

export const SUPPORTING_DOCUMENTS = [
  { key: "supplier_invoice", sw: "Invoice ya muuzaji", en: "Supplier invoice" },
  { key: "quotation", sw: "Nukuu ya bei", en: "Quotation" },
  { key: "delivery_note", sw: "Hati ya kupokea mzigo", en: "Delivery note" },
  { key: "requisition", sw: "Ombi la ununuzi", en: "Purchase requisition" },
  { key: "fuel_receipt", sw: "Risiti ya mafuta", en: "Fuel receipt/voucher" },
  { key: "trip_sheet", sw: "Karatasi ya safari", en: "Trip sheet" },
  { key: "repair_report", sw: "Ripoti ya matengenezo", en: "Repair report" },
  { key: "other", sw: "Nyingine", en: "Other" },
] as const;
export type SupportingDocument = (typeof SUPPORTING_DOCUMENTS)[number]["key"];

const byKey = <T extends { key: string }>(list: readonly T[], key: string | null) => list.find((x) => x.key === key) ?? null;
export const paymentMethod = (key: string | null) => byKey(PAYMENT_METHODS, key);
export const supportingDocument = (key: string | null) => byKey(SUPPORTING_DOCUMENTS, key);

// The label a screen shows, in the reader's language. The PDF always prints `en`.
export const choiceLabel = (choice: { sw: string; en: string } | null, t: Tr) => (choice ? t(choice.sw, choice.en) : null);
