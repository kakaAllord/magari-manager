"use client";

import { useActionState, useState } from "react";
import { createManager, reactivateStaff, setManagerPassword } from "@/app/actions/managers";
import { Dialog } from "@/components/dialog";
import { Icon } from "@/components/icons";
import { PasswordInput } from "@/components/password-input";
import { RowMenu } from "@/components/row-menu";
import { Toast } from "@/components/toast";
import { staffLabel, type StaffRole } from "@/lib/staff";

function Message({ state }: { state: { ok: boolean; message: string } | undefined }) {
  if (!state) return null;
  return (
    <p role="status" className={`rounded-md px-3 py-2 text-sm ${state.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
      {state.message}
    </p>
  );
}

const roleHints: Record<StaffRole, string> = {
  factory_manager: "Anaidhinisha maombi yaliyokubaliwa na meneja kabla mhasibu hajalipa, na anaongeza mameneja.",
  manager: "Anakubali maombi ya madereva, anarekodi mapato, magari, madereva na mafuta.",
  accountant: "Analipa maombi yaliyoidhinishwa na meneja wa kiwanda, na kuweka risiti.",
};

// The header button and its dialog. Once someone is added the dialog closes and a toast confirms it.
// `roles` are the positions the signed-in person may fill; with one, there is nothing to choose.
export function AddStaff({ roles, label = "Ongeza mfanyakazi" }: { roles: StaffRole[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createManager, undefined);
  const [role, setRole] = useState<StaffRole>(roles[0]);
  const [toast, setToast] = useState<string | null>(null);
  // Close the dialog once a new person has been added (React's "adjust state on change" pattern).
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state?.ok) {
      setOpen(false);
      setToast(state.message);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary gap-2">
        <Icon name="plus" className="size-4" />
        {label}
      </button>
      {toast && <Toast key={toast} message={toast} onClose={() => setToast(null)} />}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        description="Ataingia kwa barua pepe na nenosiri unaloweka hapa."
      >
        <form action={action} className="grid gap-4">
          {roles.length > 1 ? (
            <label className="block">
              <span className="label">Nafasi</span>
              <select name="role" value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className="input">
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {staffLabel[r]}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-muted">{roleHints[role]}</span>
            </label>
          ) : (
            <>
              <input type="hidden" name="role" value={role} />
              <p className="text-sm text-muted">{roleHints[role]}</p>
            </>
          )}
          <label className="block">
            <span className="label">Jina kamili</span>
            <input name="name" required autoComplete="off" placeholder="Asha Said" className="input" />
          </label>
          <label className="block">
            <span className="label">Barua pepe</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="asha@zuraja.com"
              className="input"
            />
          </label>
          <PasswordInput label="Nenosiri la kumpa" />
          {state && !state.ok && <Message state={state} />}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">
              Ghairi
            </button>
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? "Inaongeza…" : "Ongeza"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

// The "⋯" menu on each row: a new password. Nobody can be switched off from the app; someone switched off
// before that was removed can only be switched back on.
export function StaffMenu({ id, name, active }: { id: number; name: string; active: boolean }) {
  const [dialog, setDialog] = useState<"password" | "active" | null>(null);
  // Switching someone back on re-renders the row with the new status: close its dialog then.
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    setWasActive(active);
    setDialog(null);
  }

  return (
    <>
      <RowMenu
        label={`Vitendo kwa ${name}`}
        items={
          active
            ? [{ label: "Badilisha nenosiri", icon: "key", onSelect: () => setDialog("password") }]
            : [{ label: "Washa tena", icon: "power", tone: "ok", onSelect: () => setDialog("active") }]
        }
      />

      <Dialog
        open={dialog === "password"}
        onClose={() => setDialog(null)}
        title="Badilisha nenosiri"
        description={`${name} atatolewa kwenye vifaa vyote na kuingia kwa nenosiri jipya.`}
      >
        <PasswordForm id={id} onDone={() => setDialog(null)} />
      </Dialog>
      <Dialog
        open={dialog === "active"}
        onClose={() => setDialog(null)}
        title={`Washa ${name} tena?`}
        description="Ataweza kuingia tena kwa nenosiri lake la zamani."
      >
        <ReactivateForm id={id} onCancel={() => setDialog(null)} />
      </Dialog>
    </>
  );
}

function PasswordForm({ id, onDone }: { id: number; onDone: () => void }) {
  const [state, action, pending] = useActionState(setManagerPassword, undefined);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="managerId" value={id} />
      <PasswordInput label="Nenosiri jipya" />
      <Message state={state} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="btn btn-ghost">
          {state?.ok ? "Funga" : "Ghairi"}
        </button>
        {!state?.ok && (
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? "Inahifadhi…" : "Hifadhi nenosiri"}
          </button>
        )}
      </div>
    </form>
  );
}

function ReactivateForm({ id, onCancel }: { id: number; onCancel: () => void }) {
  const [state, action, pending] = useActionState(reactivateStaff, undefined);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="managerId" value={id} />
      <Message state={state} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn btn-ghost">
          Hapana
        </button>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Subiri…" : "Ndiyo, washa"}
        </button>
      </div>
    </form>
  );
}
