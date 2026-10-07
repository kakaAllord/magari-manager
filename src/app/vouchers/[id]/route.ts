import { getVoucherRequest } from "@/lib/requests";
import { requireUser } from "@/lib/session";
import { buildVoucherPdf } from "@/lib/voucher-pdf";

// A payment's voucher (hati ya malipo) as a PDF to print, sign and file, named by its number.
// Staff see every voucher; a driver sees only their own, as with receipts.
export async function GET(_request: Request, ctx: RouteContext<"/vouchers/[id]">) {
  const user = await requireUser();
  const id = Number((await ctx.params).id);
  const request = Number.isInteger(id) ? await getVoucherRequest(id, user.role === "driver" ? user.id : null) : null;
  if (!request?.voucher_number) return new Response("Haipo", { status: 404 });
  const pdf = await buildVoucherPdf(request);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${request.voucher_number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
