"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createManager, setManagerActive, setManagerPassword } from "@/app/actions/managers";
import { Dialog } from "@/components/dialog";
import { Icon } from "@/components/icons";
import { PasswordInput } from "@/components/password-input";
import { Toast } from "@/components/toast";

function Message({ state }: { state: { ok: boolean; message: string } | undefined }) {
  if (!state) return null;
  return (
    <p role="status" className={`rounded-md px-3 py-2 text-sm ${state.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
      {state.message}
    </p>
  );
}

const roleHints = {
  manager: "Anakubali maombi ya madereva, anarekodi mapato na kufuatilia mafuta.",
  accountant: "Analipa maombi yaliyokubaliwa na meneja.",
};

// The header button and its dialog. Once someone is added the dialog closes and a toast confirms it.
export function AddStaff() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createManager, undefined);
  const [role, setRole] = useState<"manager" | "accountant">("manager");
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
        Ongeza mfanyakazi
      </button>
      {toast && <Toast key={toast} message={toast} onClose={() => setToast(null)} />}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Ongeza mfanyakazi"
        description="Ataingia kwa barua pepe na nenosiri unaloweka hapa."
      >
        <form action={action} className="grid gap-4">
          <label className="block">
            <span className="label">Nafasi</span>
            <select
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="input"
            >
              <option value="manager">Meneja</option>
              <option value="accountant">Mhasibu</option>
            </select>
            <span className="mt-1 block text-xs text-muted">{roleHints[role]}</span>
          </label>
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

// The "⋯" menu on each row: a new password, or switching the person off or back on.
export function StaffMenu({ id, name, active }: { id: number; name: string; active: boolean }) {
  const [menu, setMenu] = useState(false);
  const [dialog, setDialog] = useState<"password" | "active" | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  // Switching someone off or on re-renders the row with the new status: close its dialog then.
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    setWasActive(active);
    setDialog(null);
  }

  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menu]);

  const pick = (d: "password" | "active") => {
    setMenu(false);
    setDialog(d);
  };

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setMenu((m) => !m)}
        aria-haspopup="menu"
        aria-expanded={menu}
        aria-label={`Vitendo kwa ${name}`}
        className="btn btn-ghost size-10 rounded-full p-0 sm:size-9"
      >
        <Icon name="more" className="size-5" />
      </button>
      {menu && (
        <div role="menu" className="absolute right-0 z-30 mt-1 grid w-56 rounded-xl border border-line bg-surface p-1 shadow-lg">
          {active && (
            <button
              type="button"
              role="menuitem"
              onClick={() => pick("password")}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-background"
            >
              <Icon name="key" className="size-4 text-muted" />
              Badilisha nenosiri
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => pick("active")}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-background ${active ? "text-danger" : "text-ok"}`}
          >
            <Icon name="power" className="size-4" />
            {active ? "Zima" : "Washa tena"}
          </button>
        </div>
      )}

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
        title={active ? `Zima ${name}?` : `Washa ${name} tena?`}
        description={
          active
            ? "Hataweza kuingia hadi umwashe tena. Jina lake linabaki kwenye historia."
            : "Ataweza kuingia tena kwa nenosiri lake la zamani."
        }
      >
        <ActiveForm id={id} active={active} onCancel={() => setDialog(null)} />
      </Dialog>
    </div>
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

function ActiveForm({ id, active, onCancel }: { id: number; active: boolean; onCancel: () => void }) {
  const [state, action, pending] = useActionState(setManagerActive, undefined);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="managerId" value={id} />
      <input type="hidden" name="active" value={active ? "0" : "1"} />
      <Message state={state} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn btn-ghost">
          Hapana
        </button>
        <button
          type="submit"
          disabled={pending}
          className={`btn ${active ? "bg-danger text-white hover:opacity-90" : "btn-primary"}`}
        >
          {pending ? "Subiri…" : active ? "Ndiyo, zima" : "Ndiyo, washa"}
        </button>
      </div>
    </form>
  );
}
