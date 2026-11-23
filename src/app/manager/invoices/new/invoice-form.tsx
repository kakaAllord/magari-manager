"use client";

import type { Tr } from "@/lib/i18n";
import { useT } from "@/components/lang-provider";
import { useActionState, useState } from "react";
import { createInvoice } from "@/app/actions/invoices";
import { Icon } from "@/components/icons";
import { amountInEnglish } from "@/lib/amount-words-en";
import { formatMoney } from "@/lib/format";
import type { CarOption } from "@/lib/reports";
import {
  BANK_LIMITS,
  invoiceUnit,
  MAX_INVOICE_LINES,
  MAX_INVOICE_TEXT,
  parseInvoiceLine,
  type InvoiceBankInput,
  type InvoiceLineInput,
} from "@/lib/validation";

const blank: InvoiceLineInput = { description: "", plate: "", quantity: "", unit: "tonne", rate: "" };
const lineAmount = (l: InvoiceLineInput) => {
  const figures = parseInvoiceLine(l);
  return "amount" in figures ? figures.amount : null;
};

// What each field of a line is called: a trip by the tonne or the kilo, or mengineyo (car hire, a job
// not weighed), which is a description, a quantity and a price each.
const lineWords = (unit: InvoiceLineInput["unit"], i: number, t: Tr) =>
  unit === "other"
    ? {
        legend: t(`Mengineyo ${i + 1}`, `Other item ${i + 1}`),
        description: t("Maelezo", "Description"),
        descriptionPlaceholder: t("Kukodi gari siku 3", "Car hire, 3 days"),
        quantity: t("Idadi", "Quantity"),
        quantityPlaceholder: "1",
        rate: t("Bei kwa kimoja", "Price each"),
        ratePlaceholder: "1,500,000",
      }
    : {
        legend: t(`Safari ${i + 1}`, `Trip ${i + 1}`),
        description: t("Kutoka - kwenda", "From - to"),
        descriptionPlaceholder: "Dar es Salaam - Mwanza",
        quantity: t("Uzito", "Weight"),
        quantityPlaceholder: unit === "kg" ? "1,250" : "30",
        rate: unit === "kg" ? t("Bei kwa kilo", "Price per kilo") : t("Bei kwa tani", "Price per tonne"),
        ratePlaceholder: unit === "kg" ? "52.5" : "45,000",
      };

// The bank block, one field per line of the invoice's bank details.
const bankFields = (t: Tr): { key: keyof InvoiceBankInput; name: string; label: string; optional?: boolean; placeholder: string }[] => [
  { key: "name", name: "bankName", label: t("Jina la benki", "Bank name"), placeholder: t("Mfano: CRDB Bank PLC", "E.g. CRDB Bank PLC") },
  { key: "accountNumber", name: "bankAccountNumber", label: t("Namba ya akaunti", "Account number"), placeholder: t("Mfano: 0150xxxxxxxxx", "E.g. 0150xxxxxxxxx") },
  { key: "accountName", name: "bankAccountName", label: t("Jina la akaunti", "Account name"), placeholder: t("Jina lililo kwenye akaunti", "The name on the account") },
  { key: "swift", name: "bankSwift", label: "SWIFT code", optional: true, placeholder: t("Mfano: CORUTZTZ", "E.g. CORUTZTZ") },
  { key: "purpose", name: "paymentPurpose", label: t("Malipo ni ya", "Payment for"), optional: true, placeholder: t("Mfano: Gharama za kusafirisha kahawa", "E.g. Coffee transport charges") },
];

// The customer, the trips (each priced by the tonne or by the kilo), and the bank to pay into. Amounts are
// worked out again on the server. `bank` starts as the last invoice's bank details.
export function InvoiceForm({ cars, today, bank }: { cars: CarOption[]; today: string; bank: InvoiceBankInput }) {
  const t = useT();
  const [state, action, pending] = useActionState(createInvoice, undefined);
  const failed = state;
  // Each line keeps a stable key so removing one doesn't shift what's typed in the others.
  const [lines, setLines] = useState(() =>
    (failed?.values.lines.length ? failed.values.lines : [blank]).map((l, i) => ({ key: i, ...l })),
  );
  const [nextKey, setNextKey] = useState(lines.length);
  const set = (key: number, field: keyof InvoiceLineInput, value: string) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
  const total = lines.reduce((sum, l) => sum + (lineAmount(l) ?? 0), 0);
  const e = failed?.errors;

  return (
    <form action={action} className="grid gap-6">
      <section className="card grid gap-3 sm:grid-cols-2">
        <h2 className="text-lg font-semibold sm:col-span-2">{t("Mteja", "Client")}</h2>
        <label className="block sm:col-span-2">
          <span className="label">{t("Jina la mteja", "Client's name")}</span>
          <input name="customer" required maxLength={120} placeholder={t("Mfano: Kilimanjaro Traders Ltd", "E.g. Kilimanjaro Traders Ltd")} defaultValue={failed?.values.customer} className="input" />
          {e?.customer && <p className="mt-1 text-sm text-danger">{e.customer}</p>}
        </label>
        <label className="block sm:col-span-2">
          <span className="label">
            {t("Mawasiliano", "Contact")} <span className="font-normal text-muted">{t("(si lazima)", "(optional)")}</span>
          </span>
          <textarea
            name="contact"
            rows={2}
            maxLength={MAX_INVOICE_TEXT}
            placeholder={t("Simu, anwani, TIN", "Phone, address, TIN")}
            defaultValue={failed?.values.contact}
            className="input"
          />
          {e?.contact && <p className="mt-1 text-sm text-danger">{e.contact}</p>}
        </label>
        <label className="block">
          <span className="label">{t("Tarehe ya invoice", "Invoice date")}</span>
          <input type="date" name="issuedOn" required max={today} defaultValue={failed?.values.issuedOn || today} className="input" />
          {e?.issuedOn && <p className="mt-1 text-sm text-danger">{e.issuedOn}</p>}
        </label>
        <label className="block">
          <span className="label">{t("Mwisho wa kulipa", "Due date")}</span>
          <input type="date" name="dueOn" required defaultValue={failed?.values.dueOn} className="input" />
          {e?.dueOn && <p className="mt-1 text-sm text-danger">{e.dueOn}</p>}
        </label>
      </section>

      <section className="card grid gap-4">
        <div>
          <h2 className="text-lg font-semibold">{t("Safari", "Trips")}</h2>
          <p className="text-sm text-muted">
            {t(
              "Kila safari: tani × bei kwa tani, au kilo × bei kwa kilo. Kwa kukodi gari au kazi isiyopimwa kwa uzito, chagua Mengineyo: idadi × bei kwa kimoja.",
              "Each trip: tonnes × price per tonne, or kilos × price per kilo. For car hire or work not measured by weight, pick Other: quantity × price each.",
            )}
          </p>
        </div>
        {lines.map((l, i) => {
          const le = e?.line?.[i];
          const amount = lineAmount(l);
          const w = lineWords(l.unit, i, t);
          return (
            <fieldset key={l.key} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-6">
              <div className="flex items-center justify-between sm:col-span-6">
                <legend className="text-sm font-medium">{w.legend}</legend>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                    className="btn btn-ghost size-11 p-0 sm:size-9"
                    aria-label={t(`Ondoa ${w.legend}`, `Remove ${w.legend}`)}
                  >
                    <Icon name="close" className="size-4" />
                  </button>
                )}
              </div>
              <label className="block sm:col-span-4">
                <span className="label">{w.description}</span>
                <input
                  name="description"
                  maxLength={160}
                  placeholder={w.descriptionPlaceholder}
                  value={l.description}
                  onChange={(ev) => set(l.key, "description", ev.target.value)}
                  className="input"
                />
                {le?.description && <p className="mt-1 text-sm text-danger">{le.description}</p>}
              </label>
              <label className="block sm:col-span-2">
                <span className="label">
                  {t("Gari", "Car")} <span className="font-normal text-muted">{t("(si lazima)", "(optional)")}</span>
                </span>
                <select name="plate" value={l.plate} onChange={(ev) => set(l.key, "plate", ev.target.value)} className="input">
                  <option value="">{t("Bila gari", "No car")}</option>
                  {cars.map((c) => (
                    <option key={c.id} value={c.plate}>
                      {c.plate}
                    </option>
                  ))}
                </select>
              </label>
              <div className="sm:col-span-2">
                <label htmlFor={`quantity-${l.key}`} className="label">
                  {w.quantity}
                </label>
                <div className="flex gap-2">
                  <input
                    id={`quantity-${l.key}`}
                    name="quantity"
                    inputMode="decimal"
                    placeholder={w.quantityPlaceholder}
                    value={l.quantity}
                    onChange={(ev) => set(l.key, "quantity", ev.target.value)}
                    className="input min-w-0 flex-1 tabular-nums"
                  />
                  <select
                    name="unit"
                    value={l.unit}
                    onChange={(ev) => set(l.key, "unit", invoiceUnit(ev.target.value))}
                    aria-label={t(`Kipimo cha ${w.legend}`, `Unit of ${w.legend}`)}
                    className="input w-auto shrink-0"
                  >
                    <option value="tonne">{t("Tani", "Tonnes")}</option>
                    <option value="kg">{t("Kilo", "Kilos")}</option>
                    <option value="other">{t("Mengineyo", "Other")}</option>
                  </select>
                </div>
                {le?.quantity && <p className="mt-1 text-sm text-danger">{le.quantity}</p>}
              </div>
              <label className="block sm:col-span-2">
                <span className="label">{w.rate}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">TSh</span>
                  <input
                    name="rate"
                    inputMode="decimal"
                    placeholder={w.ratePlaceholder}
                    value={l.rate}
                    onChange={(ev) => set(l.key, "rate", ev.target.value)}
                    className="input pl-12 tabular-nums"
                  />
                </div>
                {le?.rate && <p className="mt-1 text-sm text-danger">{le.rate}</p>}
              </label>
              <div className="flex items-center justify-between gap-2 sm:col-span-2 sm:items-end sm:justify-end">
                <span className="text-sm text-muted sm:hidden">{t("Kiasi", "Amount")}</span>
                <span className="py-2.5 font-semibold tabular-nums">{amount === null ? "–" : formatMoney(amount)}</span>
              </div>
            </fieldset>
          );
        })}
        {e?.lines && <p className="text-sm text-danger">{e.lines}</p>}
        {lines.length < MAX_INVOICE_LINES && (
          <button
            type="button"
            onClick={() => {
              setLines((ls) => [...ls, { key: nextKey, ...blank }]);
              setNextKey((k) => k + 1);
            }}
            className="btn btn-ghost gap-2 justify-self-start"
          >
            <Icon name="plus" className="size-4" />
            {t("Ongeza safari", "Add trip")}
          </button>
        )}
        <div className="grid gap-1 rounded-lg bg-background px-3 py-2.5" aria-live="polite">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted">{t("Jumla ya invoice", "Invoice total")}</span>
            <span className="text-lg font-semibold tabular-nums">{total > 0 ? formatMoney(total) : "–"}</span>
          </div>
          {total > 0 && <p className="text-sm break-words text-muted">{amountInEnglish(total)}</p>}
        </div>
      </section>

      <section className="card grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <h2 className="text-lg font-semibold">{t("Taarifa za benki", "Bank details")}</h2>
          <p className="text-sm text-muted">{t("Zinaanza na za invoice iliyopita.", "They start from the last invoice's.")}</p>
        </div>
        {bankFields(t).map((f) => (
          <label key={f.key} className={`block ${f.key === "purpose" ? "sm:col-span-2" : ""}`}>
            <span className="label">
              {f.label} {f.optional && <span className="font-normal text-muted">{t("(si lazima)", "(optional)")}</span>}
            </span>
            <input
              name={f.name}
              required={!f.optional}
              maxLength={BANK_LIMITS[f.key]}
              placeholder={f.placeholder}
              defaultValue={failed?.values.bank?.[f.key] ?? bank[f.key]}
              className={`input ${f.key === "swift" ? "uppercase" : ""}`}
            />
            {e?.bank?.[f.key] && <p className="mt-1 text-sm text-danger">{e.bank[f.key]}</p>}
          </label>
        ))}
      </section>

      <section className="card grid gap-3">
        <p className="text-sm text-muted">
          {t(
            "Ukihifadhi, kila mstari unaingia Mapato kama deni la mteja. Akilipa, bonyeza Imelipwa kwenye invoice au Pokea malipo kwenye Madeni.",
            "Once saved, each line goes into Income as the client's debt. When they pay, press Paid on the invoice or Take payment on Debts.",
          )}
        </p>
        <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto sm:justify-self-start">
          {pending ? t("Inahifadhi…", "Saving…") : t("Hifadhi invoice", "Save invoice")}
        </button>
      </section>
    </form>
  );
}
