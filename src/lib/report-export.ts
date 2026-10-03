import "server-only";
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
// `?format=pdf` gives the PDF; anything else the Excel workbook.
export async function reportResponse(request: Request) {
  const sp = searchParamsOf(request);
  const data = await getReportData(sp);
  if (sp.format === "pdf") {
    const pdf = await buildPdf(data);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${reportFilename(data.params, "pdf")}"`,
        "Cache-Control": "no-store",
      },
    });
  }
  const file = await buildWorkbook(data);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${reportFilename(data.params)}"`,
      "Cache-Control": "no-store",
    },
  });
}
