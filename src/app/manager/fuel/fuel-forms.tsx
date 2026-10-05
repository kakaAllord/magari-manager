"use client";

import { useActionState } from "react";
import { recordReading, saveTank } from "@/app/actions/fuel";
import { GaugePicker } from "@/components/gauge-picker";

type CarChoice = { id: number; plate: string; car: string | null; driver: string | null; last: string | null };

// `preselect` picks a car when the manager arrives from its "bado halijapimwa" link on Magari.
export function ReadingForm({ cars, preselect }: { cars: CarChoice[]; preselect?: number }) {
  const [state, action, pending] = useActionState(recordReading, undefined);
  const failed = state && !state.ok ? state : undefined;

  return (
    // A fresh key after each save clears the form for the next car.
    <form action={action} key={state?.ok ? state.savedAt : "form"} className="grid gap-4">
      <label className="block">
        <span className="label">Gari</span>
        <select
          key={failed ? `car-${failed.values.carId}` : "fresh"}
          name="carId"
          required
          defaultValue={failed?.values.carId ?? (cars.some((c) => c.id === preselect) ? String(preselect) : "")}
          className="input"
        >
          <option value="" disabled>
            Chagua namba ya gari
          </option>
          {cars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.plate} · {c.driver ?? "hana dereva"}
              {c.last ? ` · mwisho km ${c.last}` : " · bado halijapimwa"}
            </option>
          ))}
        </select>
        {failed?.errors.carId && <p className="mt-1 text-sm text-danger">{failed.errors.carId}</p>}
      </label>
      <label className="block">
        <span className="label">Kilomita (odomita)</span>
        <input
          name="odometer"
          inputMode="numeric"
          placeholder="45,500"
          required
          defaultValue={failed?.values.odometer}
          className="input text-lg font-semibold tabular-nums sm:text-lg"
        />
        {failed?.errors.odometer && <p className="mt-1 text-sm text-danger">{failed.errors.odometer}</p>}
      </label>
      <GaugePicker defaultValue={failed?.values.gauge} error={failed?.errors.gauge} />
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Inahifadhi…" : "Hifadhi kipimo"}
      </button>
      {state?.ok && (
        <p role="status" className="rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">
          {state.message}
        </p>
      )}
    </form>
  );
}

export function TankForm({
  carId,
  fuelType,
  tank,
}: {
  carId: number;
  fuelType: "petrol" | "diesel" | null;
  tank: number | null;
}) {
  const [state, action, pending] = useActionState(saveTank, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="carId" value={carId} />
      <select name="fuelType" required defaultValue={fuelType ?? ""} aria-label="Aina ya mafuta" className="input w-auto">
        <option value="" disabled>
          Mafuta?
        </option>
        <option value="petrol">Petroli</option>
        <option value="diesel">Dizeli</option>
      </select>
      <div className="relative w-28">
        <input
          name="tank"
          inputMode="numeric"
          placeholder="60"
          defaultValue={tank ?? undefined}
          aria-label="Lita za tanki"
          className="input pr-9 tabular-nums"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">L</span>
      </div>
      <button type="submit" disabled={pending} className="btn btn-ghost">
        Hifadhi
      </button>
      {state && <span className={`text-sm ${state.ok ? "text-ok" : "text-danger"}`}>{state.message}</span>}
    </form>
  );
}
