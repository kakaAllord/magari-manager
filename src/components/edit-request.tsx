"use client";

import { useActionState, useState } from "react";
import { updateRequest, type EditRequestState } from "@/app/actions/requests";
import { Dialog } from "@/components/dialog";
import { EntryDate } from "@/components/entry-date";
import { Toast } from "@/components/toast";
import { formatMoney } from "@/lib/format";
import type { MoneyRequest } from "@/lib/requests";
import { TIME_ZONE } from "@/lib/time";
import { MAX_REASON_LENGTH } from "@/lib/validation";

const Err = ({ text }: { text?: string }) => (text ? <p className="mt-1 text-sm text-danger">{text}</p> : null);
const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date(d));

// "Badilisha" on a matumizi request the mhasibu hasn't paid, or on typed-in history. Fuel is edited
// as price and litres, like when it was asked for; the amount is worked out again.
export function EditRequest({ request: r, today }: { request: MoneyRequest; today: string }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [state, action, pending] = useActionState(async (prev: EditRequestState, formData: FormData) => {
    const result = await updateRequest(prev, formData);
    if (result?.ok) {
      setOpen(false);
      setToast(result.message);
    }
    return result;
  }, undefined);
  const errors = state && !state.ok ? state.errors : {};
  const fuel = r.kind === "fuel" && r.fuel_price !== null;
  const history = r.backfilled_at !== null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost shrink-0">
        Badilisha
      </button>
      {toast && <Toast key={toast} message={toast} onClose={() => setToast(null)} />}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Badilisha matumizi"
        description={`${formatMoney(r.amount)} · ${r.requester_name}`}
      >
        <form action={action} className="grid gap-3">
          <input type="hidden" name="id" value={r.id} />
          {fuel ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label">Bei kwa lita</span>
                <input name="fuelPrice" inputMode="numeric" required autoComplete="off" defaultValue={r.fuel_price!.toLocaleString("en")} className="input tabular-nums" />
                <Err text={errors.fuelPrice} />
              </label>
              <label className="block">
                <span className="label">Lita</span>
                <input
                  name="litres"
                  inputMode="decimal"
                  required
                  autoComplete="off"
                  defaultValue={String(Number((Number(r.amount) / r.fuel_price!).toFixed(2)))}
                  className="input tabular-nums"
                />
                <Err text={errors.litres} />
              </label>
            </div>
          ) : (
            <label className="block">
              <span className="label">Kiasi</span>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">TSh</span>
                <input name="amount" inputMode="numeric" required autoComplete="off" defaultValue={Number(r.amount).toLocaleString("en")} className="input pl-12 font-semibold tabular-nums" />
              </div>
              <Err text={errors.amount} />
            </label>
          )}
          <label className="block">
            <span className="label">Sababu</span>
            <textarea name="reason" required rows={2} maxLength={MAX_REASON_LENGTH} defaultValue={r.reason} className="input" />
            <Err text={errors.reason} />
          </label>
          {history ? (
            <EntryDate today={today} defaultValue={day(r.issued_at ?? r.created_at)} error={errors.date} pastHint="Rekodi ya zamani: tarehe hii ndiyo itakayotumika kwenye ripoti." />
          ) : (
            <input type="hidden" name="date" value="" />
          )}
          {r.status === "authorised" && (
            <p className="rounded-md bg-warn-soft px-2 py-1 text-xs text-warn">
              Meneja wa kiwanda ameshaidhinisha. Ukibadilisha kiasi, litarudi kwake kuidhinishwa tena.
            </p>
          )}
          <Err text={errors.form} />
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">
              Ghairi
            </button>
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? "Inahifadhi…" : "Hifadhi mabadiliko"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
