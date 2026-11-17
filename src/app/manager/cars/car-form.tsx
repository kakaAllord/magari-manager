"use client";

import { useT } from "@/components/lang-provider";
import { useActionState, useState } from "react";
import { createCar, deleteCar, updateCar, type CarFormState } from "@/app/actions/cars";
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
  const t = useT();
  const [tank, setTank] = useState(failed?.values.tank ?? (car?.tank ? String(car.tank) : ""));
  const tankLitres = /^\d+$/.test(tank) ? Number(tank) : null;
  return (
    <>
      <label className="block">
        <span className="label">
          {t("Aina", "Model")} <span className="font-normal text-muted">{t("(si lazima)", "(optional)")}</span>
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
          <span className="label">{t("Mafuta", "Fuel")}</span>
          <select name="fuelType" defaultValue={failed?.values.fuelType ?? car?.fuelType ?? ""} className="input">
            <option value="">{t("Bado", "Not yet")}</option>
            <option value="petrol">{t("Petroli", "Petrol")}</option>
            <option value="diesel">{t("Dizeli", "Diesel")}</option>
          </select>
        </label>
        <label className="block">
          <span className="label">{t("Tanki (lita)", "Tank (litres)")}</span>
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
          <legend className="px-1 text-sm font-medium">{t("Kipimo cha sasa", "Current reading")}</legend>
          <p className="-mt-1 text-xs text-muted">{t("Mafuta yanapimwa kuanzia hapa.", "Fuel is measured from here.")}</p>
          <label className="block">
            <span className="label">{t("Kilomita (odomita)", "Kilometres (odometer)")}</span>
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
            label={t("Mafuta yaliyopo (geji)", "Fuel in the tank (gauge)")}
            tankLitres={tankLitres}
            defaultValue={failed?.values.gauge}
            error={failed?.errors.gauge}
          />
        </fieldset>
      )}
      <p className="text-xs text-muted">
        {t(
          "Unaweza kujaza haya baadaye, lakini gari halitaombewa mafuta kabla ya kuwa na aina ya mafuta, tanki na kipimo cha sasa.",
          "You can fill these in later, but no fuel can be asked for the car before it has a fuel type, a tank size and a current reading.",
        )}
      </p>
    </>
  );
}

// The header button and its dialog. Only the plate is needed.
export function AddCar() {
  const t = useT();
  const { open, setOpen, action, pending, failed, toastView } = useCarDialog(createCar);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary gap-2">
        <Icon name="plus" className="size-4" />
        {t("Ongeza gari", "Add car")}
      </button>
      {toastView}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("Ongeza gari", "Add car")}
        description={t("Namba ya gari ndiyo dereva atakayoitumia kuingia.", "The plate is what the driver will sign in with.")}
      >
        <form action={action} className="grid gap-4">
          <label className="block">
            <span className="label">{t("Namba ya gari", "Plate")}</span>
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
            {pending ? t("Inaongeza…", "Adding…") : t("Ongeza gari", "Add car")}
          </button>
        </form>
      </Dialog>
    </>
  );
}

// One car on Magari: plate and Aina, what's missing for fuel (a tap opens the edit dialog), the
// driver picker passed in as `children`, and a "⋯" menu with the same dialog and Futa gari.
// `used`: something was booked to the car, so it can't be deleted.
export function CarRow({
  car,
  missing,
  driverless,
  used,
  children,
}: {
  car: EditableCar;
  missing: string;
  driverless: boolean;
  used: boolean;
  children: React.ReactNode;
}) {
  const t = useT();
  const { open, setOpen, action, pending, failed, toastView } = useCarDialog(updateCar);
  const [deleting, setDeleting] = useState(false);
  return (
    <li className="flex items-start gap-3 py-4 sm:items-center">
      <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            <span className="plate">{car.plate}</span>
            {car.name}
            {driverless && <span className="text-xs font-normal text-warn">{t("Hana dereva", "No driver")}</span>}
          </p>
          {missing && (
            <button type="button" onClick={() => setOpen(true)} className="mt-1 text-left text-xs text-warn underline">
              {t(`Bado haliko tayari kwa mafuta: weka ${missing}`, `Not ready for fuel yet: add the ${missing}`)}
            </button>
          )}
        </div>
        {children}
      </div>
      <RowMenu
        label={t(`Vitendo kwa ${car.plate}`, `Actions for ${car.plate}`)}
        items={[
          { label: t("Badilisha taarifa", "Edit details"), icon: "car", onSelect: () => setOpen(true) },
          { label: t("Futa gari", "Delete car"), icon: "close", tone: "danger", onSelect: () => setDeleting(true) },
        ]}
      />
      {toastView}

      <Dialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title={used ? t(`${car.plate} haliwezi kufutwa`, `${car.plate} can't be deleted`) : t(`Futa ${car.plate}?`, `Delete ${car.plate}?`)}
        description={
          used
            ? t(
                "Lina maombi au mapato yaliyorekodiwa. Gari lenye historia halifutwi, ili matumizi yasihamishwe wala kufichwa.",
                "It has requests or income recorded. A car with history isn't deleted, so spending is neither moved nor hidden.",
              )
            : t(
                `Kwa gari lililoongezwa kimakosa, kama namba iliyokosewa. Linaondolewa kabisa pamoja na vipimo vyake vya mafuta.${
                  driverless ? "" : " Dereva wake atatolewa na hataweza kuingia hadi apewe gari lingine."
                }`,
                `For a car added by mistake, like a mistyped plate. It is removed for good with its fuel readings.${
                  driverless ? "" : " Its driver is taken off it and can't sign in until given another car."
                }`,
              )
        }
      >
        <DeleteCarForm carId={car.id} used={used} onDone={() => setDeleting(false)} />
      </Dialog>

      <Dialog open={open} onClose={() => setOpen(false)} title={t(`Taarifa za ${car.plate}`, `Details of ${car.plate}`)}>
        <form action={action} className="grid gap-4">
          <input type="hidden" name="carId" value={car.id} />
          <CarDetails failed={failed} car={car} />
          <Err text={failed?.errors.car} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">
              {t("Ghairi", "Cancel")}
            </button>
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? t("Inahifadhi…", "Saving…") : t("Hifadhi", "Save")}
            </button>
          </div>
        </form>
      </Dialog>
    </li>
  );
}

function DeleteCarForm({ carId, used, onDone }: { carId: number; used: boolean; onDone: () => void }) {
  const t = useT();
  const [state, action, pending] = useActionState(deleteCar, undefined);
  if (used) {
    return (
      <div className="flex justify-end">
        <button type="button" onClick={onDone} className="btn btn-primary">
          {t("Sawa", "OK")}
        </button>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="carId" value={carId} />
      {state && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{state.message}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="btn btn-ghost">
          {t("Hapana", "No")}
        </button>
        <button type="submit" disabled={pending} className="btn bg-danger text-white hover:opacity-90">
          {pending ? t("Inafuta…", "Deleting…") : t("Ndiyo, futa", "Yes, delete")}
        </button>
      </div>
    </form>
  );
}
