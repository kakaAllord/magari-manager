"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelInvoice, markInvoicePaid } from "@/app/actions/invoices";
import { Dialog } from "@/components/dialog";
import { Icon } from "@/components/icons";
import { Toast } from "@/components/toast";

// Download, and for an invoice still open, mark it paid or cancel it. Both ask first, since
// neither can be undone. `saved` shows the toast after the invoice was just created.
export function InvoiceActions({ id, number, open, saved }: { id: number; number: string; open: boolean; saved: boolean }) {
  const router = useRouter();
  const [ask, setAsk] = useState<"paid" | "cancel" | null>(null);
  const [toast, setToast] = useState<string | null>(saved ? `Ankara ${number} imehifadhiwa.` : null);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <a href={`/manager/invoices/${id}/pdf`} target="_blank" className="btn btn-primary gap-2">
          <Icon name="pdf" className="size-4" />
          Pakua PDF
        </a>
        {open && (
          <>
            <button type="button" onClick={() => setAsk("paid")} className="btn btn-ghost">
              Imelipwa
            </button>
            <button type="button" onClick={() => setAsk("cancel")} className="btn btn-ghost text-danger">
              Futa ankara
            </button>
          </>
        )}
      </div>
      <Dialog
        open={ask !== null}
        onClose={() => setAsk(null)}
        title={ask === "paid" ? `Mteja amelipa ${number}?` : `Futa ${number}?`}
        description={
          ask === "paid"
            ? "Ankara itaonyesha Imelipwa. Kumbuka kurekodi malipo kwenye Mapato kwa kila gari."
            : "Ankara itabaki na namba yake lakini itaonyesha Imefutwa. Haiwezi kurudishwa."
        }
      >
        <form
          action={async (formData) => {
            await (ask === "paid" ? markInvoicePaid : cancelInvoice)(formData);
            setToast(ask === "paid" ? `${number} imewekwa Imelipwa.` : `${number} imefutwa.`);
            setAsk(null);
            router.refresh();
          }}
          className="flex flex-wrap justify-end gap-2"
        >
          <input type="hidden" name="id" value={id} />
          <button type="button" onClick={() => setAsk(null)} className="btn btn-ghost">
            Hapana
          </button>
          <button type="submit" className={`btn ${ask === "paid" ? "btn-primary" : "btn-primary bg-danger"}`}>
            {ask === "paid" ? "Ndiyo, imelipwa" : "Ndiyo, futa"}
          </button>
        </form>
      </Dialog>
      {toast && <Toast key={toast} message={toast} onClose={() => setToast(null)} />}
    </>
  );
}
