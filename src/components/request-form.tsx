"use client";

import { useActionState, useState } from "react";
import type { RequestFormState } from "@/app/actions/requests";
import { EntryDate } from "@/components/entry-date";
import { GaugePicker } from "@/components/gauge-picker";
import { Icon } from "@/components/icons";
import { gaugeLabel } from "@/lib/fuel-calc";
import { formatDateTime, formatKm } from "@/lib/format";
import type { CarOption } from "@/lib/reports";
import { MAX_REASON_LENGTH } from "@/lib/validation";

// One tap fills a common reason; the driver can still type anything. Fuel is its own kind of request.
const quickReasons = ["Matengenezo", "Maegesho", "Usafi wa gari", "Ushuru wa barabara"];

// What a driver's fuel request is checked against: their car's last reading, and whether a fuel
// request is still waiting to be paid.
export type DriverFuel = { last: { odometer: number; eighths: number; at: Date } | null; openFuel: boolean } | null;

// Drivers ask for their own car, and a fuel request carries their km and gauge reading. Managers
// also pick the car (or none), and `cars` turns that on; their fuel requests carry no reading.
// `today` adds a date, so a manager can type in past expenses as history.
export function RequestForm({
  submit,
  cars,
  fuel,
  today,
  sent,
}: {
  submit: (prev: RequestFormState, formData: FormData) => Promise<RequestFormState>;
  cars?: CarOption[];
  fuel?: DriverFuel;
  today?: string;
  sent: string;
}) {
  const [state, action, pending] = useActionState(submit, undefined);
  const failed = state && !state.ok ? state : undefined;
  const [past, setPast] = useState(false);
  const [picked, setKind] = useState(failed?.values.kind ?? "other");
  const isDriver = !cars;
  const fuelBlocked = isDriver && (fuel === null || fuel?.openFuel);
  // After a fuel request goes in, fuel is blocked until it's paid, so the form falls back to the rest.
  const kind = fuelBlocked ? "other" : picked;

  return (
    <form action={action} className="grid gap-4">
      <fieldset key={fuelBlocked ? "blocked" : "open"}>
        <legend className="label">Aina ya ombi</legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-line p-1">
          {(
            [
              ["fuel", "Mafuta"],
              ["other", "Mengineyo"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md text-sm text-muted has-checked:bg-accent-soft has-checked:font-medium has-checked:text-accent has-disabled:cursor-not-allowed has-disabled:opacity-50"
            >
              <input
                type="radio"
                name="kind"
                value={value}
                // Uncontrolled, so React's form reset after a submit puts back the kind that was sent.
                defaultChecked={kind === value}
                disabled={value === "fuel" && fuelBlocked}
                onChange={() => setKind(value)}
                className="sr-only"
              />
              {value === "fuel" && <Icon name="fuel" className="size-4" />}
              {label}
            </label>
          ))}
        </div>
        {isDriver && fuel?.openFuel && (
          <p className="mt-1 text-xs text-muted">
            Ombi lako la mafuta la mwisho bado halijalipwa. Utaomba mafuta tena likishalipwa au kukataliwa.
          </p>
        )}
        {isDriver && fuel === null && <p className="mt-1 text-xs text-muted">Utaomba mafuta ukishapewa gari.</p>}
        {failed?.errors.kind && <p className="mt-1 text-sm text-danger">{failed.errors.kind}</p>}
      </fieldset>

      {cars && (
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
                {c.plate} · {c.car}
              </option>
            ))}
            {kind !== "fuel" && <option value="none">Bila gari (ofisi na mengineyo)</option>}
          </select>
          {failed?.errors.carId && <p className="mt-1 text-sm text-danger">{failed.errors.carId}</p>}
        </label>
      )}

      {today && (
        <EntryDate
          today={today}
          defaultValue={failed?.values.date}
          error={failed?.errors.date}
          onPast={setPast}
          pastHint="Tarehe iliyopita: litahifadhiwa kama matumizi ya zamani yaliyokwisha lipwa, bila kupitia kwa mhasibu."
        />
      )}

      {isDriver && kind === "fuel" && (
        <>
          <label className="block">
            <span className="label">Kilomita kwenye gari sasa</span>
            <input
              name="odometer"
              inputMode="numeric"
              placeholder={fuel?.last ? formatKm(fuel.last.odometer + 250) : "45,500"}
              required
              defaultValue={failed?.values.odometer}
              className="input text-lg font-semibold tabular-nums sm:text-lg"
            />
            {fuel?.last && (
              <p className="mt-1 text-xs text-muted">
                Kipimo cha mwisho: km {formatKm(fuel.last.odometer)} · {gaugeLabel(fuel.last.eighths)} ·{" "}
                {formatDateTime(fuel.last.at)}
              </p>
            )}
            {failed?.errors.odometer && <p className="mt-1 text-sm text-danger">{failed.errors.odometer}</p>}
          </label>
          <GaugePicker defaultValue={failed?.values.gauge} error={failed?.errors.gauge} />
        </>
      )}

      <label className="block">
        <span className="label">Kiasi</span>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">TSh</span>
          <input
            name="amount"
            inputMode="numeric"
            placeholder="40,000"
            required
            defaultValue={failed?.values.amount}
            className="input pl-12 text-lg font-semibold tabular-nums sm:text-lg"
          />
        </div>
        {failed?.errors.amount && <p className="mt-1 text-sm text-danger">{failed.errors.amount}</p>}
      </label>
      <label className="block">
        <span className="label">{kind === "fuel" ? "Maelezo (si lazima)" : "Sababu"}</span>
        <textarea
          id="reason"
          name="reason"
          rows={kind === "fuel" ? 2 : 3}
          required={kind !== "fuel"}
          maxLength={MAX_REASON_LENGTH}
          placeholder={kind === "fuel" ? "Mfano: safari ya Morogoro" : "Mfano: Kubadilisha oili"}
          defaultValue={failed?.values.reason}
          className="input"
        />
        {failed?.errors.reason && <p className="mt-1 text-sm text-danger">{failed.errors.reason}</p>}
      </label>
      {kind !== "fuel" && (
        <div className="flex flex-wrap gap-2" aria-label="Sababu za haraka">
          {quickReasons.map((r) => (
            <button
              key={r}
              type="button"
              className="chip"
              onClick={(e) => {
                const field = e.currentTarget.form?.elements.namedItem("reason");
                if (field instanceof HTMLTextAreaElement) {
                  field.value = r;
                  field.focus();
                }
              }}
            >
              {r}
            </button>
          ))}
        </div>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Inatuma…" : past ? "Hifadhi matumizi ya zamani" : cars ? "Omba na ukubali" : "Tuma ombi"}
      </button>
      {state?.ok && (
        <p role="status" className="rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">
          {state.backfilled ? "Matumizi ya zamani yamehifadhiwa kama yaliyokwisha lipwa." : sent}
        </p>
      )}
    </form>
  );
}
