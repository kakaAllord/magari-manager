"use client";

import { useActionState, useState } from "react";
import { updateIncome, type EditIncomeState } from "@/app/actions/incomes";
import { Dialog } from "@/components/dialog";
import { EntryDate } from "@/components/entry-date";
import { Toast } from "@/components/toast";
import { formatMoney } from "@/lib/format";
import type { Income } from "@/lib/incomes";
import type { CarOption } from "@/lib/reports";
import { TIME_ZONE } from "@/lib/time";
import { MAX_DESCRIPTION_LENGTH, MAX_DESTINATION_LENGTH } from "@/lib/validation";

const Err = ({ text }: { text?: string }) => (text ? <p className="mt-1 text-sm text-danger">{text}</p> : null);

const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date(d));
// What the meneja typed: kilos and the price of one kilo when it was sold that way. Kept in tonnes.
const typed = (n: number) => String(Number(n.toFixed(2)));

// "Badilisha" on a mapato entry: the same fields as when it was recorded, filled in. Cargo shows its
// price and quantity (the amount is worked out again), anything else its amount. Only history can
// change its day.
export function EditIncome({ income: i, cars, today }: { income: Income; cars: CarOption[]; today: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(i.tonnes !== null ? "cargo" : "other");
  const [unit, setUnit] = useState(i.unit === "kg" ? "kg" : "tonne");
  const [toast, setToast] = useState<string | null>(null);
  const [state, action, pending] = useActionState(async (prev: EditIncomeState, formData: FormData) => {
    const result = await updateIncome(prev, formData);
    if (result?.ok) {
      setOpen(false);
      setToast(result.message);
    }
    return result;
  }, undefined);
  const errors = state && !state.ok ? state.errors : {};
  const kilos = i.unit === "kg";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost">
        Badilisha
      </button>
      {toast && <Toast key={toast} message={toast} onClose={() => setToast(null)} />}
      <Dialog open={open} onClose={() => setOpen(false)} title="Badilisha mapato" description={`${i.source} · ${formatMoney(i.amount)}`}>
        <form action={action} className="grid gap-3">
          <input type="hidden" name="incomeId" value={i.id} />
          <label className="block">
            <span className="label">Gari</span>
            <select name="carId" defaultValue={i.car_id ?? ""} required className="input">
              {cars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.plate}
                  {c.car ? ` · ${c.car}` : ""}
                </option>
              ))}
            </select>
            <Err text={errors.carId} />
          </label>
          <label className="block">
            <span className="label">Aina</span>
            <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className="input">
              <option value="cargo">Mzigo</option>
              <option value="other">Mengineyo</option>
            </select>
          </label>
          {kind === "cargo" ? (
            <>
              <label className="block">
                <span className="label">Hesabu kwa</span>
                <select name="unit" value={unit} onChange={(e) => setUnit(e.target.value)} className="input">
                  <option value="tonne">Tani</option>
                  <option value="kg">Kilo</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="label">Bei kwa {unit === "kg" ? "kilo" : "tani"}</span>
                  <input
                    name="rate"
                    inputMode="decimal"
                    required
                    autoComplete="off"
                    defaultValue={i.rate_per_tonne !== null ? typed(Number(i.rate_per_tonne) / (kilos ? 1000 : 1)) : ""}
                    className="input tabular-nums"
                  />
                  <Err text={errors.rate} />
                </label>
                <label className="block">
                  <span className="label">{unit === "kg" ? "Kilo" : "Tani"}</span>
                  <input
                    name="quantity"
                    inputMode="decimal"
                    required
                    autoComplete="off"
                    defaultValue={i.tonnes !== null ? typed(Number(i.tonnes) * (kilos ? 1000 : 1)) : ""}
                    className="input tabular-nums"
                  />
                  <Err text={errors.quantity} />
                </label>
              </div>
              <label className="block">
                <span className="label">
                  Mahali <span className="font-normal text-muted">(si lazima)</span>
                </span>
                <input name="destination" maxLength={MAX_DESTINATION_LENGTH} defaultValue={i.destination ?? ""} className="input" />
                <Err text={errors.destination} />
              </label>
            </>
          ) : (
            <label className="block">
              <span className="label">Kiasi</span>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">TSh</span>
                <input
                  name="amount"
                  inputMode="numeric"
                  required
                  autoComplete="off"
                  defaultValue={Number(i.amount).toLocaleString("en")}
                  className="input pl-12 font-semibold tabular-nums"
                />
              </div>
              <Err text={errors.amount} />
            </label>
          )}
          {kind === "cargo" && <Err text={errors.amount} />}
          <label className="block">
            <span className="label">
              Maelezo <span className="font-normal text-muted">(si lazima)</span>
            </span>
            <input name="description" maxLength={MAX_DESCRIPTION_LENGTH} defaultValue={i.description ?? ""} className="input" />
            <Err text={errors.description} />
          </label>
          {i.backfilled_at ? (
            <EntryDate today={today} defaultValue={day(i.created_at)} error={errors.date} pastHint="Rekodi ya zamani: tarehe hii ndiyo itakayotumika kwenye ripoti." />
          ) : (
            <input type="hidden" name="date" value="" />
          )}
          {i.customer_name !== null && (
            <p className="text-xs text-muted">
              {i.customer_name} ameshalipa {formatMoney(i.amount_paid)}; kiasi kipya hakiwezi kuwa chini ya hicho.
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
