"use client";

import { useActionState } from "react";
import { createIncome } from "@/app/actions/incomes";
import { MAX_DESCRIPTION_LENGTH, MAX_SOURCE_LENGTH } from "@/lib/validation";

export function IncomeForm() {
  const [state, action, pending] = useActionState(createIncome, undefined);
  const failed = state && !state.ok ? state : undefined;

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="label">Chanzo</span>
        <input
          name="source"
          required
          maxLength={MAX_SOURCE_LENGTH}
          autoComplete="off"
          placeholder="Mfano: Safari ya Arusha"
          defaultValue={failed?.values.source}
          className="input"
        />
        {failed?.errors.source && <p className="mt-1 text-sm text-danger">{failed.errors.source}</p>}
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
      <label className="block sm:col-span-2">
        <span className="label">
          Maelezo <span className="font-normal text-muted">(si lazima)</span>
        </span>
        <textarea
          name="description"
          rows={2}
          maxLength={MAX_DESCRIPTION_LENGTH}
          placeholder="Mfano: Mteja amelipa safari ya siku mbili"
          defaultValue={failed?.values.description}
          className="input"
        />
        {failed?.errors.description && <p className="mt-1 text-sm text-danger">{failed.errors.description}</p>}
      </label>
      <div className="grid gap-2 sm:col-span-2 sm:flex sm:items-center">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Inahifadhi…" : "Hifadhi mapato"}
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
