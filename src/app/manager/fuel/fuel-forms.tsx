"use client";

import { useT } from "@/components/lang-provider";
import { useActionState } from "react";
import { recordReading, saveTank } from "@/app/actions/fuel";
import { GaugePicker } from "@/components/gauge-picker";

type CarChoice = { id: number; plate: string; car: string | null; driver: string | null; last: string | null };

// `preselect` picks a car when the manager arrives from its "bado halijapimwa" link on Magari.
export function ReadingForm({ cars, preselect }: { cars: CarChoice[]; preselect?: number }) {
  const t = useT();
  const [state, action, pending] = useActionState(recordReading, undefined);
  const failed = state && !state.ok ? state : undefined;

  return (
    // A fresh key after each save clears the form for the next car.
    <form action={action} key={state?.ok ? state.savedAt : "form"} className="grid gap-4">
      <label className="block">
        <span className="label">{t("Gari", "Car")}</span>
        <select
          key={failed ? `car-${failed.values.carId}` : "fresh"}
          name="carId"
          required
          defaultValue={failed?.values.carId ?? (cars.some((c) => c.id === preselect) ? String(preselect) : "")}
          className="input"
        >
          <option value="" disabled>
            {t("Chagua namba ya gari", "Pick the car's plate")}
          </option>
          {cars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.plate} · {c.driver ?? t("hana dereva", "no driver")}
              {c.last ? t(` · mwisho km ${c.last}`, ` · last km ${c.last}`) : t(" · bado halijapimwa", " · not measured yet")}
            </option>
          ))}
        </select>
        {failed?.errors.carId && <p className="mt-1 text-sm text-danger">{failed.errors.carId}</p>}
      </label>
      <label className="block">
        <span className="label">{t("Kilomita (odomita)", "Kilometres (odometer)")}</span>
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
        {pending ? t("Inahifadhi…", "Saving…") : t("Hifadhi kipimo", "Save reading")}
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
  const t = useT();
  const [state, action, pending] = useActionState(saveTank, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="carId" value={carId} />
      <select name="fuelType" required defaultValue={fuelType ?? ""} aria-label={t("Aina ya mafuta", "Fuel type")} className="input w-auto">
        <option value="" disabled>
          {t("Mafuta?", "Fuel?")}
        </option>
        <option value="petrol">{t("Petroli", "Petrol")}</option>
        <option value="diesel">{t("Dizeli", "Diesel")}</option>
      </select>
      <div className="relative w-28">
        <input
          name="tank"
          inputMode="numeric"
          placeholder="60"
          defaultValue={tank ?? undefined}
          aria-label={t("Lita za tanki", "Tank litres")}
          className="input pr-9 tabular-nums"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">L</span>
      </div>
      <button type="submit" disabled={pending} className="btn btn-ghost">
        {t("Hifadhi", "Save")}
      </button>
      {state && <span className={`text-sm ${state.ok ? "text-ok" : "text-danger"}`}>{state.message}</span>}
    </form>
  );
}
