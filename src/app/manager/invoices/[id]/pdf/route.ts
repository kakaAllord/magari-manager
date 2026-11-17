import { getT } from "@/lib/lang";
import { buildInvoicePdf } from "@/lib/invoice-pdf";
import { getInvoice } from "@/lib/invoices";
import { requireUser } from "@/lib/session";

// The invoice as a PDF to send the customer, named by its number.
export async function GET(_request: Request, { params }: RouteContext<"/manager/invoices/[id]/pdf">) {
  await requireUser("manager");
  const id = Number((await params).id);
  const invoice = Number.isInteger(id) ? await getInvoice(id) : null;
  const t = await getT();
  if (!invoice) return new Response(t("Invoice haipo", "No such invoice"), { status: 404 });
  const pdf = await buildInvoicePdf(invoice, t);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
