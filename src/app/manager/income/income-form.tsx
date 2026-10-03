"use client";

import { useActionState, useState } from "react";
import { createIncome } from "@/app/actions/incomes";
import { EntryDate } from "@/components/entry-date";
import type { CarOption } from "@/lib/reports";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/validation";

// `today` is Tanzania's date; picking an earlier one types in past income as history.
export function IncomeForm({ cars, today }: { cars: CarOption[]; today: string }) {
  const [state, action, pending] = useActionState(createIncome, undefined);
  const failed = state && !state.ok ? state : undefined;
  const [past, setPast] = useState(false);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
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
          placeholder="Mfano: Safari ya Arusha, mteja amelipa siku mbili"
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
