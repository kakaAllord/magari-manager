"use client";

import { useActionState } from "react";
import { createManager, setManagerPassword } from "@/app/actions/managers";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation";

function Message({ state }: { state: { ok: boolean; message: string } | undefined }) {
  if (!state) return null;
  return <p className={`text-sm ${state.ok ? "text-ok" : "text-danger"}`}>{state.message}</p>;
}

export function AddManagerForm() {
  const [state, action, pending] = useActionState(createManager, undefined);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label>
        <span className="label">Jina</span>
        <input name="name" required autoComplete="off" placeholder="Asha Said" className="input" />
      </label>
      <label>
        <span className="label">Barua pepe (ya kuingia)</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="asha@kampuni.co.tz"
          className="input"
        />
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
          {pending ? "Inaongeza…" : "Ongeza meneja"}
        </button>
      </div>
      <div className="sm:col-span-2">
        <Message state={state} />
      </div>
    </form>
  );
}

export function SetManagerPasswordForm({ managerId, managerName }: { managerId: number; managerName: string }) {
  const [state, action, pending] = useActionState(setManagerPassword, undefined);

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="managerId" value={managerId} />
      <div className="flex gap-2">
        <input
          name="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          placeholder="Nenosiri jipya"
          aria-label={`Nenosiri jipya la ${managerName}`}
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
