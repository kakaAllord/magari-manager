"use client";

import { useActionState } from "react";
import { createDriver, setDriverPassword } from "@/app/actions/drivers";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation";

function Message({ state }: { state: { ok: boolean; message: string } | undefined }) {
  if (!state) return null;
  return <p className={`text-sm ${state.ok ? "text-ok" : "text-danger"}`}>{state.message}</p>;
}

export function AddDriverForm({ freeCars }: { freeCars: { id: number; label: string }[] }) {
  const [state, action, pending] = useActionState(createDriver, undefined);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label>
        <span className="label">Jina</span>
        <input name="name" required autoComplete="off" placeholder="Juma Hassan" className="input" />
      </label>
      <label>
        <span className="label">Gari (namba yake ya kuingia)</span>
        <select name="carId" defaultValue={freeCars[0]?.id ?? ""} className="input">
          {freeCars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
          <option value="">Bado hana gari</option>
        </select>
      </label>
      <label>
        <span className="label">Nenosiri la kumpa</span>
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
          {pending ? "Inaongeza…" : "Ongeza dereva"}
        </button>
      </div>
      <div className="sm:col-span-2">
        <Message state={state} />
      </div>
    </form>
  );
}

export function SetPasswordForm({ driverId, driverName }: { driverId: number; driverName: string }) {
  const [state, action, pending] = useActionState(setDriverPassword, undefined);

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="driverId" value={driverId} />
      <div className="flex gap-2">
        <input
          name="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          placeholder="Nenosiri jipya"
          aria-label={`Nenosiri jipya la ${driverName}`}
          className="input min-w-0 flex-1"
        />
        <button type="submit" disabled={pending} className="btn btn-ghost shrink-0">
          {pending ? "Inahifadhi…" : "Weka nenosiri"}
        </button>
      </div>
      <Message state={state} />
    </form>
  );
}
