import "server-only";
import { debtorsFilename, getDebtorReport } from "@/lib/debtor-data";
import { buildDebtorsPdf } from "@/lib/debtors-pdf";
import { getReportData } from "@/lib/report-data";
import { buildPdf } from "@/lib/report-pdf";
import { buildWorkbook, reportFilename } from "@/lib/workbook";

const searchParamsOf = (request: Request) => {
  const url = new URL(request.url);
  const sp: Record<string, string | string[]> = {};
  for (const key of new Set(url.searchParams.keys())) {
    const all = url.searchParams.getAll(key);
    sp[key] = all.length > 1 ? all : all[0];
  }
  return sp;
};

// The downloads behind the report's download menu. Callers check the role first.
// `?format=pdf` gives the PDF, `?format=debtors` the debtors PDF; anything else the Excel workbook.
export async function reportResponse(request: Request) {
  const sp = searchParamsOf(request);
  if (sp.format === "debtors") {
    const report = await getDebtorReport(sp);
    const pdf = await buildDebtorsPdf(report);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${debtorsFilename(report)}"`,
        "Cache-Control": "no-store",
      },
    });
  }
  const data = await getReportData(sp);
  if (sp.format === "pdf") {
    const pdf = await buildPdf(data);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${reportFilename(data.params, "pdf", data.t)}"`,
        "Cache-Control": "no-store",
      },
    });
  }
  const file = await buildWorkbook(data);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${reportFilename(data.params, "xlsx", data.t)}"`,
      "Cache-Control": "no-store",
    },
  });
}
