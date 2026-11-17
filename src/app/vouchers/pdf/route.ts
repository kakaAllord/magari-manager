import { parseReportParams } from "@/lib/report-params";
import { todayInTanzania } from "@/lib/reports";
import { MAX_VOUCHERS_PER_PDF, vouchersBetween } from "@/lib/requests";
import { requireUser } from "@/lib/session";
import { buildVouchersPdf } from "@/lib/voucher-pdf";

// Every payment voucher paid between two days (?from=&to=, this month by default) in one PDF, one
// page each and oldest first, to print and file. Staff only: a driver gets their own one by one.
export async function GET(request: Request) {
  const user = await requireUser();
  if (user.role === "driver") return new Response("Haipo", { status: 404 });
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const { from, to } = parseReportParams(sp, todayInTanzania());
  const vouchers = await vouchersBetween(from, to);
  if (vouchers.length === 0) return new Response("Hakuna payment voucher kati ya tarehe hizo.", { status: 404 });
  if (vouchers.length > MAX_VOUCHERS_PER_PDF) {
    return new Response(`Ni zaidi ya hati ${MAX_VOUCHERS_PER_PDF}. Chagua kipindi kifupi zaidi.`, { status: 413 });
  }
  const name = `Hati-za-malipo_${from}_${to}`;
  const pdf = await buildVouchersPdf(vouchers, name);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${name}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
