import { parseReportParams } from "@/lib/report-params";
import { getExpenses, listCars, summarise, todayInTanzania } from "@/lib/reports";
import { requireUser } from "@/lib/session";
import { buildWorkbook, reportFilename } from "@/lib/workbook";

export async function GET(request: Request) {
  await requireUser("manager");
  const url = new URL(request.url);
  const sp: Record<string, string | string[]> = {};
  for (const key of new Set(url.searchParams.keys())) {
    const all = url.searchParams.getAll(key);
    sp[key] = all.length > 1 ? all : all[0];
  }
  const params = parseReportParams(sp, todayInTanzania());
  const [cars, expenses] = await Promise.all([listCars(), getExpenses(params)]);
  const summary = summarise(expenses, cars, params);
  const carsLabel = params.carIds.length
    ? cars.filter((c) => params.carIds.includes(c.id)).map((c) => c.plate).join(", ")
    : `yote (${cars.length})`;

  const file = await buildWorkbook(params, summary, expenses, carsLabel);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${reportFilename(params)}"`,
      "Cache-Control": "no-store",
    },
  });
}
