"use client";

import { useT } from "@/components/lang-provider";
import { useActionState, useState } from "react";
import { createDriver, setDriverPassword } from "@/app/actions/drivers";
import { Dialog } from "@/components/dialog";
import { PasswordInput } from "@/components/password-input";
import { RowMenu } from "@/components/row-menu";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation";

function Message({ state }: { state: { ok: boolean; message: string } | undefined }) {
  if (!state) return null;
  return <p className={`text-sm ${state.ok ? "text-ok" : "text-danger"}`}>{state.message}</p>;
}

export function AddDriverForm({ freeCars }: { freeCars: { id: number; label: string }[] }) {
  const t = useT();
  const [state, action, pending] = useActionState(createDriver, undefined);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label>
        <span className="label">{t("Jina", "Name")}</span>
        <input name="name" required autoComplete="off" placeholder="Juma Hassan" className="input" />
      </label>
      <label>
        <span className="label">{t("Gari (namba yake ya kuingia)", "Car (its plate is their sign-in)")}</span>
        <select name="carId" defaultValue={freeCars[0]?.id ?? ""} className="input">
          {freeCars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
          <option value="">{t("Bado hana gari", "No car yet")}</option>
        </select>
      </label>
      <label>
        <span className="label">{t("Nenosiri la kumpa", "Their password")}</span>
        <input
          name="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          className="input"
        />
      </label>
      <div className="flex items-end">
        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending ? t("Inaongeza…", "Adding…") : t("Ongeza dereva", "Add driver")}
        </button>
      </div>
      <div className="sm:col-span-2">
        <Message state={state} />
      </div>
    </form>
  );
}

// The "⋯" menu on each driver: a new password, given in a dialog like on Wafanyakazi.
export function DriverMenu({ driverId, driverName }: { driverId: number; driverName: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <RowMenu
        label={t(`Vitendo kwa ${driverName}`, `Actions for ${driverName}`)}
        items={[{ label: t("Badilisha nenosiri", "Change password"), icon: "key", onSelect: () => setOpen(true) }]}
      />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("Badilisha nenosiri", "Change password")}
        description={t(
          `${driverName} atatolewa kwenye vifaa vyote na kuingia kwa nenosiri jipya.`,
          `${driverName} will be signed out on every device and sign in with the new password.`,
        )}
      >
        <PasswordForm driverId={driverId} onDone={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

function PasswordForm({ driverId, onDone }: { driverId: number; onDone: () => void }) {
  const t = useT();
  const [state, action, pending] = useActionState(setDriverPassword, undefined);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="driverId" value={driverId} />
      <PasswordInput label={t("Nenosiri jipya", "New password")} />
      {state && (
        <p role="status" className={`rounded-md px-3 py-2 text-sm ${state.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
          {state.message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="btn btn-ghost">
          {state?.ok ? t("Funga", "Close") : t("Ghairi", "Cancel")}
        </button>
        {!state?.ok && (
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? t("Inahifadhi…", "Saving…") : t("Hifadhi nenosiri", "Save password")}
          </button>
        )}
      </div>
    </form>
  );
}
