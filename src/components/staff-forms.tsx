"use client";

import type { Tr } from "@/lib/i18n";
import { useT } from "@/components/lang-provider";
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

const roleHint = (role: StaffRole, t: Tr) =>
  ({
    factory_manager: t(
      "Anaidhinisha maombi yaliyokubaliwa na meneja kabla mhasibu hajalipa, na anaongeza mameneja.",
      "Authorises what the vehicle manager approved before the accountant pays, and adds the managers.",
    ),
    manager: t(
      "Anakubali maombi ya madereva, anarekodi mapato, magari, madereva na mafuta.",
      "Approves drivers' requests and records income, cars, drivers and fuel.",
    ),
    accountant: t(
      "Analipa maombi yaliyoidhinishwa na meneja wa kiwanda, na kuweka risiti.",
      "Pays what the factory manager authorised and adds the receipts.",
    ),
  })[role];

// The header button and its dialog. Once someone is added the dialog closes and a toast confirms it.
// `roles` are the positions the signed-in person may fill; with one, there is nothing to choose.
export function AddStaff({ roles, label: given }: { roles: StaffRole[]; label?: string }) {
  const t = useT();
  const label = given ?? t("Ongeza mfanyakazi", "Add staff");
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
        description={t("Ataingia kwa barua pepe na nenosiri unaloweka hapa.", "They sign in with their email and the password you set here.")}
      >
        <form action={action} className="grid gap-4">
          {roles.length > 1 ? (
            <label className="block">
              <span className="label">{t("Nafasi", "Position")}</span>
              <select name="role" value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className="input">
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {staffLabel(r, t)}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-muted">{roleHint(role, t)}</span>
            </label>
          ) : (
            <>
              <input type="hidden" name="role" value={role} />
              <p className="text-sm text-muted">{roleHint(role, t)}</p>
            </>
          )}
          <label className="block">
            <span className="label">{t("Jina kamili", "Full name")}</span>
            <input name="name" required autoComplete="off" placeholder="Asha Said" className="input" />
          </label>
          <label className="block">
            <span className="label">{t("Barua pepe", "Email")}</span>
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
          <PasswordInput label={t("Nenosiri la kumpa", "Their password")} />
          {state && !state.ok && <Message state={state} />}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">
              {t("Ghairi", "Cancel")}
            </button>
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? t("Inaongeza…", "Adding…") : t("Ongeza", "Add")}
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
  const t = useT();
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
        label={t(`Vitendo kwa ${name}`, `Actions for ${name}`)}
        items={
          active
            ? [{ label: t("Badilisha nenosiri", "Change password"), icon: "key", onSelect: () => setDialog("password") }]
            : [{ label: t("Washa tena", "Switch back on"), icon: "power", tone: "ok", onSelect: () => setDialog("active") }]
        }
      />

      <Dialog
        open={dialog === "password"}
        onClose={() => setDialog(null)}
        title={t("Badilisha nenosiri", "Change password")}
        description={t(
          `${name} atatolewa kwenye vifaa vyote na kuingia kwa nenosiri jipya.`,
          `${name} will be signed out on every device and sign in with the new password.`,
        )}
      >
        <PasswordForm id={id} onDone={() => setDialog(null)} />
      </Dialog>
      <Dialog
        open={dialog === "active"}
        onClose={() => setDialog(null)}
        title={t(`Washa ${name} tena?`, `Switch ${name} back on?`)}
        description={t("Ataweza kuingia tena kwa nenosiri lake la zamani.", "They can sign in again with their old password.")}
      >
        <ReactivateForm id={id} onCancel={() => setDialog(null)} />
      </Dialog>
    </>
  );
}

function PasswordForm({ id, onDone }: { id: number; onDone: () => void }) {
  const t = useT();
  const [state, action, pending] = useActionState(setManagerPassword, undefined);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="managerId" value={id} />
      <PasswordInput label={t("Nenosiri jipya", "New password")} />
      <Message state={state} />
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

function ReactivateForm({ id, onCancel }: { id: number; onCancel: () => void }) {
  const t = useT();
  const [state, action, pending] = useActionState(reactivateStaff, undefined);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="managerId" value={id} />
      <Message state={state} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn btn-ghost">
          {t("Hapana", "No")}
        </button>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? t("Subiri…", "Wait…") : t("Ndiyo, washa", "Yes, switch on")}
        </button>
      </div>
    </form>
  );
}
