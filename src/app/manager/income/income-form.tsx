"use client";

import { useActionState, useState } from "react";
import { createIncome } from "@/app/actions/incomes";
import { EntryDate } from "@/components/entry-date";
import { formatMoney } from "@/lib/format";
import type { CarOption } from "@/lib/reports";
import { MAX_DESCRIPTION_LENGTH, MAX_DESTINATION_LENGTH } from "@/lib/validation";

// Cargo ("Mzigo") is typed as a rate per tonne and the tonnes carried; the amount is their product,
// worked out again on the server. Anything else ("Mengineyo") is a plain amount.
// `today` is Tanzania's date; picking an earlier one types in past income as history.
export function IncomeForm({ cars, today }: { cars: CarOption[]; today: string }) {
  const [state, action, pending] = useActionState(createIncome, undefined);
  const failed = state && !state.ok ? state : undefined;
  const [past, setPast] = useState(false);
  const [kind, setKind] = useState(failed?.values.kind ?? "cargo");
  // Rate and tonnes as typed, to show the total. Kept when the form comes back with an error,
  // cleared once an entry is saved.
  const [typed, setTyped] = useState({ rate: failed?.values.rate ?? "", tonnes: failed?.values.tonnes ?? "" });
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    setTyped(state && !state.ok ? { rate: state.values.rate, tonnes: state.values.tonnes } : { rate: "", tonnes: "" });
  }
  const rate = Number(typed.rate.replace(/[,\s]/g, ""));
  const tonnes = Number(/^\s*\d+,\d{1,2}\s*$/.test(typed.tonnes) ? typed.tonnes.replace(",", ".") : typed.tonnes.replace(/[,\s]/g, ""));
  const total = rate >= 100 && tonnes > 0 ? Math.round(rate * tonnes) : null;

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
            placeholder="Mfano: Dar es Salaam → Mwanza"
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
                  onInput={(e) => {
                    const value = e.currentTarget.value;
                    setTyped((t) => ({ ...t, rate: value }));
                  }}
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
                  onInput={(e) => {
                    const value = e.currentTarget.value;
                    setTyped((t) => ({ ...t, tonnes: value }));
                  }}
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
      <div className="grid gap-2 sm:col-span-2 sm:flex sm:items-center">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Inahifadhi…" : past ? "Hifadhi mapato ya zamani" : "Hifadhi mapato"}
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
