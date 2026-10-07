"use client";

import { createContext, use, useActionState, useState } from "react";
import { recordDebtPayment, type DebtPaymentState } from "@/app/actions/incomes";
import { Dialog } from "@/components/dialog";
import { Toast } from "@/components/toast";
import { formatMoney } from "@/lib/format";
import { MAX_ISSUE_NOTE_LENGTH } from "@/lib/validation";

// A debt paid off leaves the list, taking its button with it, so the confirmation lives up here.
const ShowToast = createContext<(message: string) => void>(() => {});

export function DebtToasts({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<string | null>(null);
  return (
    <ShowToast value={setToast}>
      {children}
      {toast && <Toast key={toast} message={toast} onClose={() => setToast(null)} />}
    </ShowToast>
  );
}

// "Pokea malipo" on a debt: the amount starts at everything still owed, and can be lowered when the
// client pays only some of it again.
export function DebtPayment({ incomeId, customer, owed }: { incomeId: number; customer: string; owed: number }) {
  const [open, setOpen] = useState(false);
  const showToast = use(ShowToast);
  const [state, action, pending] = useActionState(async (prev: DebtPaymentState, formData: FormData) => {
    const result = await recordDebtPayment(prev, formData);
    if (result?.ok) {
      setOpen(false);
      showToast(result.message);
    }
    return result;
  }, undefined);

  return (
    <>
      <div className="flex justify-end">
        <button type="button" onClick={() => setOpen(true)} className="btn btn-primary">
          Pokea malipo
        </button>
      </div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Malipo ya ${customer}`}
        description={`Anadaiwa ${formatMoney(owed)}. Akilipa yote, deni linafungwa.`}
      >
        <form action={action} className="grid gap-3">
          <input type="hidden" name="incomeId" value={incomeId} />
          <label className="block">
            <span className="label">Amelipa</span>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">TSh</span>
              <input
                name="amount"
                inputMode="numeric"
                required
                defaultValue={owed.toLocaleString("en")}
                className="input pl-12 font-semibold tabular-nums"
              />
            </div>
          </label>
          <label className="block">
            <span className="label">
              Kumbukumbu <span className="font-normal text-muted">(si lazima)</span>
            </span>
            <input
              name="note"
              maxLength={MAX_ISSUE_NOTE_LENGTH}
              autoComplete="off"
              placeholder="Mfano: namba ya M-Pesa au benki"
              className="input"
            />
          </label>
          {state && !state.ok && <p className="text-sm text-danger">{state.error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">
              Ghairi
            </button>
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? "Inahifadhi…" : "Hifadhi malipo"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
