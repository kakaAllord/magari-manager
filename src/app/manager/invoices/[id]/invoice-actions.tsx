"use client";

import { useT } from "@/components/lang-provider";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelInvoice, markInvoicePaid } from "@/app/actions/invoices";
import { Dialog } from "@/components/dialog";
import { Icon } from "@/components/icons";
import { Toast } from "@/components/toast";
import { formatMoney } from "@/lib/format";

// Download, and for an invoice still open, mark it paid or cancel it. Both ask first, since
// neither can be undone. `saved` shows the toast after the invoice was just created.
// `inIncome`: its trips are in Mapato, where `owed` is still the client's debt; once the client has
// paid any of it there (`partPaid`), it can no longer be cancelled.
export function InvoiceActions({
  id,
  number,
  open,
  saved,
  inIncome,
  owed,
  partPaid,
}: {
  id: number;
  number: string;
  open: boolean;
  saved: boolean;
  inIncome: boolean;
  owed: number;
  partPaid: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [ask, setAsk] = useState<"paid" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(saved ? t(`Invoice ${number} imehifadhiwa.`, `Invoice ${number} saved.`) : null);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <a href={`/manager/invoices/${id}/pdf`} target="_blank" className="btn btn-primary gap-2">
          <Icon name="pdf" className="size-4" />
          {t("Pakua PDF", "Download PDF")}
        </a>
        {open && (
          <>
            <button type="button" onClick={() => setAsk("paid")} className="btn btn-ghost">
              {t("Imelipwa", "Paid")}
            </button>
            {!partPaid && (
              <button type="button" onClick={() => setAsk("cancel")} className="btn btn-ghost text-danger">
                {t("Futa invoice", "Cancel invoice")}
              </button>
            )}
          </>
        )}
      </div>
      <Dialog
        open={ask !== null}
        onClose={() => {
          setAsk(null);
          setError(null);
        }}
        title={ask === "paid" ? t(`Mteja amelipa ${number}?`, `Did the client pay ${number}?`) : t(`Futa ${number}?`, `Cancel ${number}?`)}
        description={
          ask === "paid"
            ? inIncome
              ? t(
                  `Invoice itaonyesha Imelipwa, na deni la ${formatMoney(owed)} litaondoka kwenye Madeni na kuhesabiwa kama pesa iliyoingia kwenye Mapato.`,
                  `The invoice will show Paid, and the ${formatMoney(owed)} debt leaves Debts and counts as money received in Income.`,
                )
              : t(
                  "Invoice itaonyesha Imelipwa. Kumbuka kurekodi malipo kwenye Mapato kwa kila gari.",
                  "The invoice will show Paid. Remember to record the payment in Income for each car.",
                )
            : inIncome
              ? t(
                  "Invoice itabaki na namba yake lakini itaonyesha Imefutwa, na safari zake zitaondoka kwenye Mapato na Madeni. Haiwezi kurudishwa.",
                  "The invoice keeps its number but shows Cancelled, and its trips leave Income and Debts. This can't be undone.",
                )
              : t(
                  "Invoice itabaki na namba yake lakini itaonyesha Imefutwa. Haiwezi kurudishwa.",
                  "The invoice keeps its number but shows Cancelled. This can't be undone.",
                )
        }
      >
        {error && <p className="mb-3 text-sm text-danger">{error}</p>}
        <form
          action={async (formData) => {
            if (ask === "cancel") {
              const result = await cancelInvoice(formData);
              if (!result.ok) {
                setError(result.error);
                router.refresh();
                return;
              }
            } else {
              await markInvoicePaid(formData);
            }
            setToast(ask === "paid" ? t(`${number} imewekwa Imelipwa.`, `${number} marked Paid.`) : t(`${number} imefutwa.`, `${number} cancelled.`));
            setAsk(null);
            router.refresh();
          }}
          className="flex flex-wrap justify-end gap-2"
        >
          <input type="hidden" name="id" value={id} />
          <button
            type="button"
            onClick={() => {
              setAsk(null);
              setError(null);
            }}
            className="btn btn-ghost"
          >
            {t("Hapana", "No")}
          </button>
          <button type="submit" className={`btn ${ask === "paid" ? "btn-primary" : "btn-primary bg-danger"}`}>
            {ask === "paid" ? t("Ndiyo, imelipwa", "Yes, paid") : t("Ndiyo, futa", "Yes, cancel")}
          </button>
        </form>
      </Dialog>
      {toast && <Toast key={toast} message={toast} onClose={() => setToast(null)} />}
    </>
  );
}
