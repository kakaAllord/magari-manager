import "server-only";
import { getReportData } from "@/lib/report-data";
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
export async function reportResponse(request: Request) {
  const data = await getReportData(searchParamsOf(request));
  const file = await buildWorkbook(data);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${reportFilename(data.params)}"`,
      "Cache-Control": "no-store",
    },
  });
}
