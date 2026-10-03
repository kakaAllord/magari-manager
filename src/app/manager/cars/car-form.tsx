"use client";

import { useActionState, useState } from "react";
import { createCar, updateCar, type CarFormState } from "@/app/actions/cars";
import { Dialog } from "@/components/dialog";
import { GaugePicker } from "@/components/gauge-picker";
import { Icon } from "@/components/icons";
import { RowMenu } from "@/components/row-menu";
import { Toast } from "@/components/toast";

const Err = ({ text }: { text?: string }) => (text ? <p className="mt-1 text-sm text-danger">{text}</p> : null);

type Saved = { message: string; ready: boolean };
type Failed = Extract<NonNullable<CarFormState>, { ok: false }>;

// What a car has so far, for the edit dialog.
export type EditableCar = {
  id: number;
  plate: string;
  name: string | null;
  fuelType: "petrol" | "diesel" | null;
  tank: number | null;
  measured: boolean;
};

// Closes the dialog and confirms in a toast once a save goes through (React's "adjust state on
// change" pattern), so nothing on the page moves.
function useCarDialog(submit: (prev: CarFormState, formData: FormData) => Promise<CarFormState>) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(submit, undefined);
  const [toast, setToast] = useState<Saved | null>(null);
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state?.ok) {
      setOpen(false);
      setToast(state);
    }
  }
  const failed = state && !state.ok ? state : undefined;
  const toastView = toast && (
    <Toast key={toast.message} message={toast.message} tone={toast.ready ? "ok" : "warn"} onClose={() => setToast(null)} />
  );
  return { open, setOpen, action, pending, failed, toastView };
}

// Aina, fuel type and tank, then the starting reading while the car has none. All optional; fuel
// can't be asked for until the fuel type, tank and reading are in.
function CarDetails({ failed, car }: { failed?: Failed; car?: EditableCar }) {
  const [tank, setTank] = useState(failed?.values.tank ?? (car?.tank ? String(car.tank) : ""));
  const tankLitres = /^\d+$/.test(tank) ? Number(tank) : null;
  return (
    <>
      <label className="block">
        <span className="label">
          Aina <span className="font-normal text-muted">(si lazima)</span>
        </span>
        <input
          name="name"
          maxLength={60}
          autoComplete="off"
          placeholder="Toyota IST"
          defaultValue={failed?.values.name ?? car?.name ?? ""}
          className="input"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Mafuta</span>
          <select name="fuelType" defaultValue={failed?.values.fuelType ?? car?.fuelType ?? ""} className="input">
            <option value="">Bado</option>
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
            value={tank}
            onChange={(e) => setTank(e.target.value.trim())}
            className="input tabular-nums"
          />
          <Err text={failed?.errors.tank} />
        </label>
      </div>

      {!car?.measured && (
        <fieldset className="grid gap-3 rounded-lg border border-line p-3">
          <legend className="px-1 text-sm font-medium">Kipimo cha sasa</legend>
          <p className="-mt-1 text-xs text-muted">Mafuta yanapimwa kuanzia hapa.</p>
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
      )}
      <p className="text-xs text-muted">
        Unaweza kujaza haya baadaye, lakini gari halitaombewa mafuta kabla ya kuwa na aina ya mafuta, tanki na kipimo cha
        sasa.
      </p>
    </>
  );
}

// The header button and its dialog. Only the plate is needed.
export function AddCar() {
  const { open, setOpen, action, pending, failed, toastView } = useCarDialog(createCar);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary gap-2">
        <Icon name="plus" className="size-4" />
        Ongeza gari
      </button>
      {toastView}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Ongeza gari"
        description="Namba ya gari ndiyo dereva atakayoitumia kuingia."
      >
        <form action={action} className="grid gap-4">
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
          <CarDetails failed={failed} />
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? "Inaongeza…" : "Ongeza gari"}
          </button>
        </form>
      </Dialog>
    </>
  );
}

// One car on Magari: plate and Aina, what's missing for fuel (a tap opens the edit dialog), the
// driver picker passed in as `children`, and a "⋯" menu with the same dialog.
export function CarRow({
  car,
  missing,
  driverless,
  children,
}: {
  car: EditableCar;
  missing: string;
  driverless: boolean;
  children: React.ReactNode;
}) {
  const { open, setOpen, action, pending, failed, toastView } = useCarDialog(updateCar);
  return (
    <li className="flex items-start gap-3 py-4 sm:items-center">
      <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            <span className="plate">{car.plate}</span>
            {car.name}
            {driverless && <span className="text-xs font-normal text-warn">Hana dereva</span>}
          </p>
          {missing && (
            <button type="button" onClick={() => setOpen(true)} className="mt-1 text-left text-xs text-warn underline">
              Bado haliko tayari kwa mafuta: weka {missing}
            </button>
          )}
        </div>
        {children}
      </div>
      <RowMenu
        label={`Vitendo kwa ${car.plate}`}
        items={[{ label: "Badilisha taarifa", icon: "car", onSelect: () => setOpen(true) }]}
      />
      {toastView}

      <Dialog open={open} onClose={() => setOpen(false)} title={`Taarifa za ${car.plate}`}>
        <form action={action} className="grid gap-4">
          <input type="hidden" name="carId" value={car.id} />
          <CarDetails failed={failed} car={car} />
          <Err text={failed?.errors.car} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">
              Ghairi
            </button>
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? "Inahifadhi…" : "Hifadhi"}
            </button>
          </div>
        </form>
      </Dialog>
    </li>
  );
}
