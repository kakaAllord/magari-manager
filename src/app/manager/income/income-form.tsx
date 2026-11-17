"use client";

import { useT } from "@/components/lang-provider";
import { useActionState, useState } from "react";
import { createIncome } from "@/app/actions/incomes";
import { DuplicateWarning } from "@/components/duplicate-warning";
import { EntryDate } from "@/components/entry-date";
import { formatMoney } from "@/lib/format";
import type { CarOption } from "@/lib/reports";
import { cargoUnit, MAX_CUSTOMER_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_DESTINATION_LENGTH, parseCargo } from "@/lib/validation";

// Cargo ("Mzigo") is typed by the tonne or by the kilo, as the meneja picks: the price for one and
// how many were carried, either with decimals. The amount is their product, worked out again on the server. Anything else ("Mengineyo") is a plain amount.
// `today` is Tanzania's date; picking an earlier one types in past income as history.
// By default the client paid it all. "Amelipa sehemu" takes the client's name and what they paid now
// (0 when they paid nothing), and the rest is their debt.
export function IncomeForm({ cars, today }: { cars: CarOption[]; today: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(createIncome, undefined);
  const failed = state && !state.ok ? state : undefined;
  const [past, setPast] = useState(false);
  const [kind, setKind] = useState(failed?.values.kind ?? "cargo");
  const [unit, setUnit] = useState(cargoUnit(failed?.values.unit ?? ""));
  // Rate and quantity as typed, to show the total. Kept when the form comes back with an error,
  // cleared once an entry is saved.
  const blank = { rate: "", quantity: "", amount: "", paid: "" };
  const [typed, setTyped] = useState(failed ? pick(failed.values) : blank);
  const [payment, setPayment] = useState(failed?.values.payment ?? "full");
  const [saves, setSaves] = useState(0);
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    setTyped(state && !state.ok ? pick(state.values) : blank);
    if (state?.ok) {
      setPayment("full");
      setSaves((n) => n + 1);
    }
  }
  const type = (field: keyof typeof blank) => (e: React.FormEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setTyped((prev) => ({ ...prev, [field]: value }));
  };
  const cargo = parseCargo(typed.rate, typed.quantity, unit, "", t);
  const total = "amount" in cargo ? cargo.amount : null;
  const per = unit === "kg" ? t("kilo", "kilo") : t("tani", "tonne");
  // The job's total, cargo or not, and what stays owed after what was paid now.
  const jobTotal = kind === "cargo" ? total : shillings(typed.amount) > 0 ? shillings(typed.amount) : null;
  const paidNow = typed.paid.trim() === "" ? null : shillings(typed.paid);
  const owed = jobTotal !== null && paidNow !== null && !Number.isNaN(paidNow) ? jobTotal - paidNow : null;

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <fieldset className="sm:col-span-2">
        <legend className="label">{t("Aina ya mapato", "Kind of income")}</legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-line p-1">
          {(
            [
              ["cargo", t("Mzigo (tani au kilo)", "Cargo (tonnes or kilos)")],
              ["other", t("Mengineyo", "Other")],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-10 cursor-pointer items-center justify-center rounded-md text-sm text-muted has-checked:bg-accent-soft has-checked:font-medium has-checked:text-accent"
            >
              <input
                type="radio"
                name="kind"
                value={value}
                // Uncontrolled, so React's form reset after a submit puts back the kind that was sent.
                defaultChecked={kind === value}
                onChange={() => setKind(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="label">{t("Gari", "Car")}</span>
        {/* React doesn't apply a new defaultValue to a mounted select, so remount it to keep the car
            picked when the form comes back with an error. */}
        <select
          key={failed ? `car-${failed.values.carId}` : "fresh"}
          name="carId"
          required
          defaultValue={failed?.values.carId ?? ""}
          className="input"
        >
          <option value="" disabled>
            {t("Chagua namba ya gari", "Pick the car's plate")}
          </option>
          {cars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.plate}
              {c.car && ` · ${c.car}`}
            </option>
          ))}
        </select>
        {failed?.errors.carId && <p className="mt-1 text-sm text-danger">{failed.errors.carId}</p>}
      </label>
      {kind === "cargo" ? (
        <label className="block">
          <span className="label">
            {t("Kwenda", "Destination")} <span className="font-normal text-muted">{t("(si lazima)", "(optional)")}</span>
          </span>
          <input
            name="destination"
            maxLength={MAX_DESTINATION_LENGTH}
            placeholder={t("Mfano: Dar es Salaam - Mwanza", "E.g. Dar es Salaam - Mwanza")}
            defaultValue={failed?.values.destination}
            className="input"
          />
          {failed?.errors.destination && <p className="mt-1 text-sm text-danger">{failed.errors.destination}</p>}
        </label>
      ) : (
        <label className="block">
          <span className="label">{t("Kiasi", "Amount")}</span>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">TSh</span>
            <input
              name="amount"
              inputMode="numeric"
              required
              placeholder="350,000"
              defaultValue={failed?.values.amount}
              onInput={type("amount")}
              className="input pl-12 font-semibold tabular-nums"
            />
          </div>
          {failed?.errors.amount && <p className="mt-1 text-sm text-danger">{failed.errors.amount}</p>}
        </label>
      )}
      {kind === "cargo" && (
        <div className="grid gap-2 sm:col-span-2">
          <fieldset>
            <legend className="label">{t("Bei kwa", "Priced by")}</legend>
            <div className="grid grid-cols-2 gap-1 rounded-lg border border-line p-1">
              {(
                [
                  ["tonne", t("Tani", "Tonne")],
                  ["kg", t("Kilo (kg)", "Kilo (kg)")],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className="flex min-h-10 cursor-pointer items-center justify-center rounded-md text-sm text-muted has-checked:bg-accent-soft has-checked:font-medium has-checked:text-accent"
                >
                  <input
                    type="radio"
                    name="unit"
                    value={value}
                    // Uncontrolled like the kind, so the form's reset keeps the unit that was sent.
                    defaultChecked={unit === value}
                    onChange={() => setUnit(value)}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">{t(`Bei kwa ${per}`, `Price per ${per}`)}</span>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">TSh</span>
                <input
                  name="rate"
                  inputMode="decimal"
                  required
                  placeholder={unit === "kg" ? "52.5" : "45,000"}
                  defaultValue={failed?.values.rate}
                  onInput={type("rate")}
                  className="input pl-12 tabular-nums"
                />
              </div>
              {failed?.errors.rate && <p className="mt-1 text-sm text-danger">{failed.errors.rate}</p>}
            </label>
            <label className="block">
              <span className="label">{unit === "kg" ? t("Kilo", "Kilos") : t("Tani", "Tonnes")}</span>
              <div className="relative">
                <input
                  name="quantity"
                  inputMode="decimal"
                  required
                  placeholder={unit === "kg" ? "1,250" : "30"}
                  defaultValue={failed?.values.quantity}
                  onInput={type("quantity")}
                  className="input pr-10 tabular-nums"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">
                  {unit === "kg" ? "kg" : "t"}
                </span>
              </div>
              {failed?.errors.quantity && <p className="mt-1 text-sm text-danger">{failed.errors.quantity}</p>}
            </label>
          </div>
          <div className="flex items-baseline justify-between gap-3 rounded-lg bg-background px-3 py-2.5" aria-live="polite">
            <span className="text-sm text-muted">{t("Jumla ya mapato", "Total income")}</span>
            <span className="text-lg font-semibold text-ok tabular-nums">{total === null ? "–" : formatMoney(total)}</span>
          </div>
          {failed?.errors.amount && <p className="text-sm text-danger">{failed.errors.amount}</p>}
        </div>
      )}
      <fieldset className="grid gap-3 sm:col-span-2">
        <legend className="label">{t("Malipo", "Payment")}</legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-line p-1">
          {(
            [
              ["full", t("Amelipa yote", "Paid in full")],
              ["part", t("Amelipa sehemu / deni", "Part paid / debt")],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-10 cursor-pointer items-center justify-center rounded-md px-2 text-center text-sm text-muted has-checked:bg-accent-soft has-checked:font-medium has-checked:text-accent"
            >
              <input
                type="radio"
                name="payment"
                value={value}
                // Uncontrolled like the kind, so the form's reset keeps "Amelipa sehemu" after an error.
                // After a save they're remade on "Amelipa yote"; the ones the reset touched would miss the
                // next tap on "Amelipa sehemu".
                key={`${value}-${saves}`}
                defaultChecked={payment === value}
                onChange={() => setPayment(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
        {payment === "part" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">{t("Jina la mteja", "Client's name")}</span>
              <input
                name="customer"
                required
                maxLength={MAX_CUSTOMER_LENGTH}
                autoComplete="off"
                placeholder={t("Mfano: Kilimanjaro Traders", "E.g. Kilimanjaro Traders")}
                defaultValue={failed?.values.customer}
                className="input"
              />
              {failed?.errors.customer && <p className="mt-1 text-sm text-danger">{failed.errors.customer}</p>}
            </label>
            <label className="block">
              <span className="label">{t("Amelipa sasa", "Paid now")}</span>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">TSh</span>
                <input
                  name="paid"
                  inputMode="numeric"
                  required
                  placeholder="0"
                  defaultValue={failed?.values.paid}
                  onInput={type("paid")}
                  className="input pl-12 tabular-nums"
                />
              </div>
              {failed?.errors.paid ? (
                <p className="mt-1 text-sm text-danger">{failed.errors.paid}</p>
              ) : (
                <p className="mt-1 text-xs text-muted">{t("Andika 0 kama hajalipa chochote: yote yatakuwa deni.", "Write 0 if they paid nothing: it all becomes a debt.")}</p>
              )}
            </label>
            <div className="flex items-baseline justify-between gap-3 rounded-lg bg-warn-soft px-3 py-2.5 sm:col-span-2" aria-live="polite">
              <span className="text-sm text-muted">{t("Deni litakalobaki", "Debt left")}</span>
              <span className="text-lg font-semibold text-warn tabular-nums">
                {owed === null || owed < 0 ? "–" : formatMoney(owed)}
              </span>
            </div>
          </div>
        )}
      </fieldset>
      <EntryDate
        today={today}
        defaultValue={failed?.values.date}
        error={failed?.errors.date}
        onPast={setPast}
        pastHint={t("Tarehe iliyopita: yatahifadhiwa kama mapato ya zamani ya siku hiyo.", "A past date: it is saved as past income of that day.")}
      />
      <label className="block sm:col-span-2">
        <span className="label">
          {t("Maelezo", "Description")} <span className="font-normal text-muted">{t("(si lazima)", "(optional)")}</span>
        </span>
        <textarea
          name="description"
          rows={2}
          maxLength={MAX_DESCRIPTION_LENGTH}
          placeholder={
            kind === "cargo"
              ? t("Mfano: mzigo wa saruji, mteja Kilimanjaro Traders", "E.g. cement load, client Kilimanjaro Traders")
              : t("Mfano: Safari ya Arusha, mteja amelipa siku mbili", "E.g. Arusha trip, client paid for two days")
          }
          defaultValue={failed?.values.description}
          className="input"
        />
        {failed?.errors.description && <p className="mt-1 text-sm text-danger">{failed.errors.description}</p>}
      </label>
      {failed?.duplicate && (
        <div className="sm:col-span-2">
          <DuplicateWarning match={failed.duplicate} what={t("Mapato", "Income")} />
        </div>
      )}
      <div className="grid gap-2 sm:col-span-2 sm:flex sm:items-center">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending
            ? t("Inahifadhi…", "Saving…")
            : failed?.duplicate
              ? t("Ndiyo, ni mapya: hifadhi", "Yes, it's new: save")
              : past
                ? t("Hifadhi mapato ya zamani", "Save past income")
                : payment === "part"
                  ? t("Hifadhi mapato na deni", "Save income and debt")
                  : t("Hifadhi mapato", "Save income")}
        </button>
        {state?.ok && (
          <p role="status" className="text-sm text-ok">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

// Shillings as typed, "350,000" or "350000"; NaN when it isn't a number.
const shillings = (typed: string) => Number(typed.replace(/[,\s]/g, ""));

const pick = (v: { rate: string; quantity: string; amount: string; paid: string }) => ({
  rate: v.rate,
  quantity: v.quantity,
  amount: v.amount,
  paid: v.paid,
});
