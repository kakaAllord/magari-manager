import "server-only";
import { parseReportParams } from "@/lib/report-params";
import { getExpenses, getIncomes, listCars, summarise, summariseIncome, todayInTanzania } from "@/lib/reports";
import { buildWorkbook, reportFilename } from "@/lib/workbook";

// The Excel download behind both roles' "Pakua Excel" button. Callers check the role first.
export async function reportResponse(request: Request) {
  const url = new URL(request.url);
  const sp: Record<string, string | string[]> = {};
  for (const key of new Set(url.searchParams.keys())) {
    const all = url.searchParams.getAll(key);
    sp[key] = all.length > 1 ? all : all[0];
  }
  const params = parseReportParams(sp, todayInTanzania());
  const [cars, expenses, incomes] = await Promise.all([listCars(), getExpenses(params), getIncomes(params)]);
  const summary = summarise(expenses, cars, params);
  const carsLabel = params.carIds.length
    ? cars.filter((c) => params.carIds.includes(c.id)).map((c) => c.plate).join(", ")
    : `yote (${cars.length})`;

  const file = await buildWorkbook(params, summary, expenses, summariseIncome(incomes, params), incomes, carsLabel);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${reportFilename(params)}"`,
      "Cache-Control": "no-store",
    },
  });
}
