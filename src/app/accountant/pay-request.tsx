"use client";

import { useT } from "@/components/lang-provider";
import { useActionState, useState } from "react";
import { payRequest } from "@/app/actions/requests";
import { Dialog } from "@/components/dialog";
import { formatMoney } from "@/lib/format";
import { MAX_ISSUE_NOTE_LENGTH, MAX_SUPPORTING_OTHER } from "@/lib/validation";
import { PAYMENT_METHODS, SUPPORTING_DOCUMENTS } from "@/lib/voucher-fields";

const Err = ({ text }: { text?: string }) => (text ? <p className="mt-1 text-sm text-danger">{text}</p> : null);

// The Lipa button on an authorised request and its dialog: how it was paid, the reference (needed
// unless it's cash) and the documents attached, for the payment voucher. Fuel suggests its receipt.
export function PayRequest({ id, amount, summary, fuel }: { id: number; amount: string; summary: string; fuel: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("cash");
  const [other, setOther] = useState(false);
  // Once paid, the server sends the page back with ?paid= and the row is gone; only errors come back here.
  const [state, action, pending] = useActionState(payRequest, undefined);
  const errors = state?.errors ?? {};

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary">
        {t("Lipa", "Pay")} {formatMoney(amount)}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`${t("Lipa", "Pay")} ${formatMoney(amount)}`} description={summary}>
        <form action={action} className="grid gap-4">
          <input type="hidden" name="id" value={id} />
          <fieldset>
            <legend className="label">{t("Njia ya malipo", "Paid by")}</legend>
            <div className="grid grid-cols-2 gap-1 rounded-lg border border-line p-1 sm:grid-cols-4">
              {PAYMENT_METHODS.map((m) => (
                <label
                  key={m.key}
                  className="flex min-h-10 cursor-pointer items-center justify-center rounded-md px-2 text-center text-sm text-muted has-checked:bg-accent-soft has-checked:font-medium has-checked:text-accent"
                >
                  <input
                    type="radio"
                    name="method"
                    value={m.key}
                    checked={method === m.key}
                    onChange={() => setMethod(m.key)}
                    className="sr-only"
                  />
                  {m.key === "mobile" ? t("Simu", "Mobile") : t<string>(m.sw, m.en)}
                </label>
              ))}
            </div>
            <Err text={errors.method} />
          </fieldset>
          <label className="block">
            <span className="label">
              {t("Namba ya kumbukumbu", "Reference number")}{" "}
              {method === "cash" && <span className="font-normal text-muted">{t("(si lazima)", "(optional)")}</span>}
            </span>
            <input
              name="reference"
              required={method !== "cash"}
              maxLength={MAX_ISSUE_NOTE_LENGTH}
              autoComplete="off"
              placeholder={
                method === "mobile"
                  ? t("Mfano: QX12AB34CD (M-Pesa)", "E.g. QX12AB34CD (M-Pesa)")
                  : method === "bank"
                    ? t("Namba ya muamala wa benki", "Bank transaction number")
                    : method === "cheque"
                      ? t("Namba ya hundi", "Cheque number")
                      : t("Mfano: namba ya stakabadhi", "E.g. the slip number")
              }
              className="input"
            />
            <Err text={errors.reference} />
          </label>
          <fieldset>
            <legend className="label">
              {t("Viambatisho", "Attached")} <span className="font-normal text-muted">{t("(si lazima)", "(optional)")}</span>
            </legend>
            <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
              {SUPPORTING_DOCUMENTS.map((d) => (
                <label key={d.key} className="flex min-h-9 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="documents"
                    value={d.key}
                    defaultChecked={fuel && d.key === "fuel_receipt"}
                    onChange={d.key === "other" ? (e) => setOther(e.currentTarget.checked) : undefined}
                    className="size-4 accent-accent"
                  />
                  {t<string>(d.sw, d.en)}
                </label>
              ))}
            </div>
            {other && (
              <input
                name="documentsOther"
                maxLength={MAX_SUPPORTING_OTHER}
                placeholder={t("Kiambatisho gani?", "What document?")}
                aria-label={t("Kiambatisho kingine", "Other document")}
                className="input mt-2"
              />
            )}
            <Err text={errors.other} />
          </fieldset>
          <Err text={errors.form} />
          <p className="text-xs text-muted">
            {t(
              "Payment voucher inatengenezwa yenyewe ukithibitisha, na ombi linahamia Risiti.",
              "The payment voucher is made by itself when you confirm, and the request moves to Receipts.",
            )}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">
              {t("Ghairi", "Cancel")}
            </button>
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? t("Inalipa…", "Paying…") : t("Thibitisha malipo", "Confirm payment")}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
