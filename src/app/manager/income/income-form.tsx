"use client";

import { useActionState, useState } from "react";
import { createIncome } from "@/app/actions/incomes";
import { DuplicateWarning } from "@/components/duplicate-warning";
import { EntryDate } from "@/components/entry-date";
import { formatMoney } from "@/lib/format";
import type { CarOption } from "@/lib/reports";
import { MAX_CUSTOMER_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_DESTINATION_LENGTH } from "@/lib/validation";

// Cargo ("Mzigo") is typed as a rate per tonne and the tonnes carried; the amount is their product,
// worked out again on the server. Anything else ("Mengineyo") is a plain amount.
// `today` is Tanzania's date; picking an earlier one types in past income as history.
// By default the client paid it all. "Amelipa sehemu" takes the client's name and what they paid now
// (0 when they paid nothing), and the rest is their debt.
export function IncomeForm({ cars, today }: { cars: CarOption[]; today: string }) {
  const [state, action, pending] = useActionState(createIncome, undefined);
  const failed = state && !state.ok ? state : undefined;
  const [past, setPast] = useState(false);
  const [kind, setKind] = useState(failed?.values.kind ?? "cargo");
  // Rate and tonnes as typed, to show the total. Kept when the form comes back with an error,
  // cleared once an entry is saved.
  const blank = { rate: "", tonnes: "", amount: "", paid: "" };
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
    setTyped((t) => ({ ...t, [field]: value }));
  };
  const rate = shillings(typed.rate);
  const tonnes = Number(/^\s*\d+,\d{1,2}\s*$/.test(typed.tonnes) ? typed.tonnes.replace(",", ".") : typed.tonnes.replace(/[,\s]/g, ""));
  const total = rate >= 100 && tonnes > 0 ? Math.round(rate * tonnes) : null;
  // The job's total, cargo or not, and what stays owed after what was paid now.
  const jobTotal = kind === "cargo" ? total : shillings(typed.amount) > 0 ? shillings(typed.amount) : null;
  const paidNow = typed.paid.trim() === "" ? null : shillings(typed.paid);
  const owed = jobTotal !== null && paidNow !== null && !Number.isNaN(paidNow) ? jobTotal - paidNow : null;

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <fieldset className="sm:col-span-2">
        <legend className="label">Aina ya mapato</legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-line p-1">
          {(
            [
              ["cargo", "Mzigo (kwa tani)"],
              ["other", "Mengineyo"],
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
        <span className="label">Gari</span>
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
            Chagua namba ya gari
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
            Kwenda <span className="font-normal text-muted">(si lazima)</span>
          </span>
          <input
            name="destination"
            maxLength={MAX_DESTINATION_LENGTH}
            placeholder="Mfano: Dar es Salaam - Mwanza"
            defaultValue={failed?.values.destination}
            className="input"
          />
          {failed?.errors.destination && <p className="mt-1 text-sm text-danger">{failed.errors.destination}</p>}
        </label>
      ) : (
        <label className="block">
          <span className="label">Kiasi</span>
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
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Bei kwa tani</span>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">TSh</span>
                <input
                  name="rate"
                  inputMode="numeric"
                  required
                  placeholder="45,000"
                  defaultValue={failed?.values.rate}
                  onInput={type("rate")}
                  className="input pl-12 tabular-nums"
                />
              </div>
              {failed?.errors.rate && <p className="mt-1 text-sm text-danger">{failed.errors.rate}</p>}
            </label>
            <label className="block">
              <span className="label">Tani</span>
              <div className="relative">
                <input
                  name="tonnes"
                  inputMode="decimal"
                  required
                  placeholder="30"
                  defaultValue={failed?.values.tonnes}
                  onInput={type("tonnes")}
                  className="input pr-10 tabular-nums"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">t</span>
              </div>
              {failed?.errors.tonnes && <p className="mt-1 text-sm text-danger">{failed.errors.tonnes}</p>}
            </label>
          </div>
          <div className="flex items-baseline justify-between gap-3 rounded-lg bg-background px-3 py-2.5" aria-live="polite">
            <span className="text-sm text-muted">Jumla ya mapato</span>
            <span className="text-lg font-semibold text-ok tabular-nums">{total === null ? "–" : formatMoney(total)}</span>
          </div>
          {failed?.errors.amount && <p className="text-sm text-danger">{failed.errors.amount}</p>}
        </div>
      )}
      <fieldset className="grid gap-3 sm:col-span-2">
        <legend className="label">Malipo</legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-line p-1">
          {(
            [
              ["full", "Amelipa yote"],
              ["part", "Amelipa sehemu / deni"],
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
              <span className="label">Jina la mteja</span>
              <input
                name="customer"
                required
                maxLength={MAX_CUSTOMER_LENGTH}
                autoComplete="off"
                placeholder="Mfano: Kilimanjaro Traders"
                defaultValue={failed?.values.customer}
                className="input"
              />
              {failed?.errors.customer && <p className="mt-1 text-sm text-danger">{failed.errors.customer}</p>}
            </label>
            <label className="block">
              <span className="label">Amelipa sasa</span>
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
                <p className="mt-1 text-xs text-muted">Andika 0 kama hajalipa chochote: yote yatakuwa deni.</p>
              )}
            </label>
            <div className="flex items-baseline justify-between gap-3 rounded-lg bg-warn-soft px-3 py-2.5 sm:col-span-2" aria-live="polite">
              <span className="text-sm text-muted">Deni litakalobaki</span>
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
        pastHint="Tarehe iliyopita: yatahifadhiwa kama mapato ya zamani ya siku hiyo."
      />
      <label className="block sm:col-span-2">
        <span className="label">
          Maelezo <span className="font-normal text-muted">(si lazima)</span>
        </span>
        <textarea
          name="description"
          rows={2}
          maxLength={MAX_DESCRIPTION_LENGTH}
          placeholder={kind === "cargo" ? "Mfano: mzigo wa saruji, mteja Kilimanjaro Traders" : "Mfano: Safari ya Arusha, mteja amelipa siku mbili"}
          defaultValue={failed?.values.description}
          className="input"
        />
        {failed?.errors.description && <p className="mt-1 text-sm text-danger">{failed.errors.description}</p>}
      </label>
      {failed?.duplicate && (
        <div className="sm:col-span-2">
          <DuplicateWarning match={failed.duplicate} what="Mapato" />
        </div>
      )}
      <div className="grid gap-2 sm:col-span-2 sm:flex sm:items-center">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending
            ? "Inahifadhi…"
            : failed?.duplicate
              ? "Ndiyo, ni mapya: hifadhi"
              : past
                ? "Hifadhi mapato ya zamani"
                : payment === "part"
                  ? "Hifadhi mapato na deni"
                  : "Hifadhi mapato"}
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

const pick = (v: { rate: string; tonnes: string; amount: string; paid: string }) => ({
  rate: v.rate,
  tonnes: v.tonnes,
  amount: v.amount,
  paid: v.paid,
});
