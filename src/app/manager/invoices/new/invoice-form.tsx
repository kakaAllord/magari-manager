"use client";

import { useActionState, useState } from "react";
import { createInvoice } from "@/app/actions/invoices";
import { Icon } from "@/components/icons";
import { amountInEnglish } from "@/lib/amount-words-en";
import { formatMoney } from "@/lib/format";
import type { CarOption } from "@/lib/reports";
import {
  BANK_LIMITS,
  cargoUnit,
  MAX_INVOICE_LINES,
  MAX_INVOICE_TEXT,
  parseCargo,
  type InvoiceBankInput,
  type InvoiceLineInput,
} from "@/lib/validation";

const blank: InvoiceLineInput = { description: "", plate: "", quantity: "", unit: "tonne", rate: "" };
const lineAmount = (l: InvoiceLineInput) => {
  const cargo = parseCargo(l.rate, l.quantity, l.unit, "");
  return "amount" in cargo ? cargo.amount : null;
};

// The bank block, one field per line of the invoice's bank details.
const BANK_FIELDS: { key: keyof InvoiceBankInput; name: string; label: string; optional?: boolean; placeholder: string }[] = [
  { key: "name", name: "bankName", label: "Jina la benki", placeholder: "Mfano: CRDB Bank PLC" },
  { key: "accountNumber", name: "bankAccountNumber", label: "Namba ya akaunti", placeholder: "Mfano: 0150xxxxxxxxx" },
  { key: "accountName", name: "bankAccountName", label: "Jina la akaunti", placeholder: "Jina lililo kwenye akaunti" },
  { key: "swift", name: "bankSwift", label: "SWIFT code", optional: true, placeholder: "Mfano: CORUTZTZ" },
  { key: "purpose", name: "paymentPurpose", label: "Malipo ni ya", optional: true, placeholder: "Mfano: Gharama za kusafirisha kahawa" },
];

// The customer, the trips (each priced by the tonne or by the kilo), and the bank to pay into. Amounts are
// worked out again on the server. `bank` starts as the last invoice's bank details.
export function InvoiceForm({ cars, today, bank }: { cars: CarOption[]; today: string; bank: InvoiceBankInput }) {
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
        <h2 className="text-lg font-semibold sm:col-span-2">Mteja</h2>
        <label className="block sm:col-span-2">
          <span className="label">Jina la mteja</span>
          <input name="customer" required maxLength={120} placeholder="Mfano: Kilimanjaro Traders Ltd" defaultValue={failed?.values.customer} className="input" />
          {e?.customer && <p className="mt-1 text-sm text-danger">{e.customer}</p>}
        </label>
        <label className="block sm:col-span-2">
          <span className="label">
            Mawasiliano <span className="font-normal text-muted">(si lazima)</span>
          </span>
          <textarea
            name="contact"
            rows={2}
            maxLength={MAX_INVOICE_TEXT}
            placeholder="Simu, anwani, TIN"
            defaultValue={failed?.values.contact}
            className="input"
          />
          {e?.contact && <p className="mt-1 text-sm text-danger">{e.contact}</p>}
        </label>
        <label className="block">
          <span className="label">Tarehe ya invoice</span>
          <input type="date" name="issuedOn" required max={today} defaultValue={failed?.values.issuedOn || today} className="input" />
          {e?.issuedOn && <p className="mt-1 text-sm text-danger">{e.issuedOn}</p>}
        </label>
        <label className="block">
          <span className="label">
Mwisho wa kulipa</span>
          <input type="date" name="dueOn" required defaultValue={failed?.values.dueOn} className="input" />
          {e?.dueOn && <p className="mt-1 text-sm text-danger">{e.dueOn}</p>}
        </label>
      </section>

      <section className="card grid gap-4">
        <div>
          <h2 className="text-lg font-semibold">Safari</h2>
          <p className="text-sm text-muted">Kila safari: tani × bei kwa tani, au kilo × bei kwa kilo.</p>
        </div>
        {lines.map((l, i) => {
          const le = e?.line?.[i];
          const amount = lineAmount(l);
          return (
            <fieldset key={l.key} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-6">
              <div className="flex items-center justify-between sm:col-span-6">
                <legend className="text-sm font-medium">Safari {i + 1}</legend>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                    className="btn btn-ghost size-11 p-0 sm:size-9"
                    aria-label={`Ondoa safari ${i + 1}`}
                  >
                    <Icon name="close" className="size-4" />
                  </button>
                )}
              </div>
              <label className="block sm:col-span-4">
                <span className="label">Kutoka - kwenda</span>
                <input
                  name="description"
                  maxLength={160}
                  placeholder="Dar es Salaam - Mwanza"
                  value={l.description}
                  onChange={(ev) => set(l.key, "description", ev.target.value)}
                  className="input"
                />
                {le?.description && <p className="mt-1 text-sm text-danger">{le.description}</p>}
              </label>
              <label className="block sm:col-span-2">
                <span className="label">
                  Gari <span className="font-normal text-muted">(si lazima)</span>
                </span>
                <select name="plate" value={l.plate} onChange={(ev) => set(l.key, "plate", ev.target.value)} className="input">
                  <option value="">Bila gari</option>
                  {cars.map((c) => (
                    <option key={c.id} value={c.plate}>
                      {c.plate}
                    </option>
                  ))}
                </select>
              </label>
              <div className="sm:col-span-2">
                <label htmlFor={`quantity-${l.key}`} className="label">
                  Uzito
                </label>
                <div className="flex gap-2">
                  <input
                    id={`quantity-${l.key}`}
                    name="quantity"
                    inputMode="decimal"
                    placeholder={l.unit === "kg" ? "1,250" : "30"}
                    value={l.quantity}
                    onChange={(ev) => set(l.key, "quantity", ev.target.value)}
                    className="input min-w-0 flex-1 tabular-nums"
                  />
                  <select
                    name="unit"
                    value={l.unit}
                    onChange={(ev) => set(l.key, "unit", cargoUnit(ev.target.value))}
                    aria-label={`Kipimo cha safari ${i + 1}`}
                    className="input w-auto shrink-0"
                  >
                    <option value="tonne">Tani</option>
                    <option value="kg">Kilo</option>
                  </select>
                </div>
                {le?.quantity && <p className="mt-1 text-sm text-danger">{le.quantity}</p>}
              </div>
              <label className="block sm:col-span-2">
                <span className="label">Bei kwa {l.unit === "kg" ? "kilo" : "tani"}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">TSh</span>
                  <input
                    name="rate"
                    inputMode="decimal"
                    placeholder={l.unit === "kg" ? "52.5" : "45,000"}
                    value={l.rate}
                    onChange={(ev) => set(l.key, "rate", ev.target.value)}
                    className="input pl-12 tabular-nums"
                  />
                </div>
                {le?.rate && <p className="mt-1 text-sm text-danger">{le.rate}</p>}
              </label>
              <div className="flex items-center justify-between gap-2 sm:col-span-2 sm:items-end sm:justify-end">
                <span className="text-sm text-muted sm:hidden">Kiasi</span>
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
            Ongeza safari
          </button>
        )}
        <div className="grid gap-1 rounded-lg bg-background px-3 py-2.5" aria-live="polite">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted">Jumla ya invoice</span>
            <span className="text-lg font-semibold tabular-nums">{total > 0 ? formatMoney(total) : "–"}</span>
          </div>
          {total > 0 && <p className="text-sm break-words text-muted">{amountInEnglish(total)}</p>}
        </div>
      </section>

      <section className="card grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <h2 className="text-lg font-semibold">Taarifa za benki</h2>
          <p className="text-sm text-muted">Zinaanza na za invoice iliyopita.</p>
        </div>
        {BANK_FIELDS.map((f) => (
          <label key={f.key} className={`block ${f.key === "purpose" ? "sm:col-span-2" : ""}`}>
            <span className="label">
              {f.label} {f.optional && <span className="font-normal text-muted">(si lazima)</span>}
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
          Ukihifadhi, kila safari inaingia Mapato kama deni la mteja. Akilipa, bonyeza Imelipwa kwenye invoice au Pokea malipo kwenye
          Madeni.
        </p>
        <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto sm:justify-self-start">
          {pending ? "Inahifadhi…" : "Hifadhi invoice"}
        </button>
      </section>
    </form>
  );
}
