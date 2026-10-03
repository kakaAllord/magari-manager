"use client";

import { useActionState, useState } from "react";
import { createCar } from "@/app/actions/cars";
import { Dialog } from "@/components/dialog";
import { GaugePicker } from "@/components/gauge-picker";
import { Icon } from "@/components/icons";

const Err = ({ text }: { text?: string }) => (text ? <p className="mt-1 text-sm text-danger">{text}</p> : null);

// The header button and its dialog: the car, its fuel and tank, and what it reads now. The reading
// can wait, but no fuel can be asked for the car until it has one.
export function AddCar() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createCar, undefined);
  const failed = state && !state.ok ? state : undefined;
  const [tank, setTank] = useState("");
  // Close the dialog once the car is saved (React's "adjust state on change" pattern).
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state?.ok) {
      setOpen(false);
      setTank("");
    }
  }
  const tankLitres = /^\d+$/.test(tank) ? Number(tank) : null;

  return (
    <div className="grid justify-items-end gap-2">
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary gap-2">
        <Icon name="plus" className="size-4" />
        Ongeza gari
      </button>
      {state?.ok && !open && (
        <p role="status" className={`text-right text-sm ${state.measured ? "text-ok" : "text-warn"}`}>
          {state.message}
        </p>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Ongeza gari"
        description="Namba ya gari ndiyo dereva atakayoitumia kuingia."
      >
        <form action={action} className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="label">Namba ya gari</span>
              <input
                name="plate"
                required
                autoCapitalize="characters"
                placeholder="T103ABE"
                defaultValue={failed?.values.plate}
                className="input font-mono tracking-wider uppercase placeholder:normal-case"
              />
              <Err text={failed?.errors.plate} />
            </label>
            <label className="block">
              <span className="label">Aina</span>
              <input name="make" required placeholder="Toyota" defaultValue={failed?.values.make} className="input" />
            </label>
            <label className="block">
              <span className="label">Modeli</span>
              <input name="model" required placeholder="IST" defaultValue={failed?.values.model} className="input" />
            </label>
          </div>
          <Err text={failed?.errors.car} />

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Mafuta</span>
              <select name="fuelType" defaultValue={failed?.values.fuelType ?? "petrol"} className="input">
                <option value="petrol">Petroli</option>
                <option value="diesel">Dizeli</option>
              </select>
            </label>
            <label className="block">
              <span className="label">Tanki (lita)</span>
              <input
                name="tank"
                inputMode="numeric"
                placeholder="60"
                defaultValue={failed?.values.tank}
                onChange={(e) => setTank(e.target.value.trim())}
                className="input tabular-nums"
              />
              <Err text={failed?.errors.tank} />
            </label>
          </div>

          <fieldset className="grid gap-3 rounded-lg border border-line p-3">
            <legend className="px-1 text-sm font-medium">Kipimo cha sasa</legend>
            <p className="-mt-1 text-xs text-muted">
              Mafuta yanapimwa kuanzia hapa. Unaweza kuacha sasa na kurekodi baadaye kwenye Mafuta, lakini gari halitaombewa
              mafuta kabla ya kipimo hiki.
            </p>
            <label className="block">
              <span className="label">Kilomita (odomita)</span>
              <input
                name="odometer"
                inputMode="numeric"
                placeholder="45,500"
                defaultValue={failed?.values.odometer}
                className="input tabular-nums"
              />
              <Err text={failed?.errors.odometer} />
            </label>
            <GaugePicker
              optional
              label="Mafuta yaliyopo (geji)"
              tankLitres={tankLitres}
              defaultValue={failed?.values.gauge}
              error={failed?.errors.gauge}
            />
          </fieldset>

          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? "Inaongeza…" : "Ongeza gari"}
          </button>
        </form>
      </Dialog>
    </div>
  );
}
