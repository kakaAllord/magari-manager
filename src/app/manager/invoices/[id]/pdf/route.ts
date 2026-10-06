import { buildInvoicePdf } from "@/lib/invoice-pdf";
import { getInvoice } from "@/lib/invoices";
import { requireUser } from "@/lib/session";

// The invoice as a PDF to send the customer, named by its number.
export async function GET(_request: Request, { params }: RouteContext<"/manager/invoices/[id]/pdf">) {
  await requireUser("manager");
  const id = Number((await params).id);
  const invoice = Number.isInteger(id) ? await getInvoice(id) : null;
  if (!invoice) return new Response("Ankara haipo", { status: 404 });
  const pdf = await buildInvoicePdf(invoice);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
