import { getT } from "@/lib/lang";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { Pager, pageFrom } from "@/components/pager";
import { formatMoney } from "@/lib/format";
import { INCOME_PAGE_SIZE, listIncomes } from "@/lib/incomes";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { listCars, todayInTanzania } from "@/lib/reports";
import { requireUser } from "@/lib/session";
import { IncomeList } from "../income-list";

export default async function IncomeHistoryPage({ searchParams }: PageProps<"/manager/income/history">) {
  const manager = await requireUser("manager");
  const t = await getT();
  const sp = await searchParams;
  const page = pageFrom(sp);
  const carId = Number(sp.car) || null;
  const [{ rows, total }, cars] = await Promise.all([listIncomes(manager.id, { page, carId }), listCars()]);
  const pageTotal = rows.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader title={t("Historia ya mapato", "Income history")} description={t("Mapato yote yaliyorekodiwa, mapya juu.", "All recorded income, newest first.")} />

      <section className="card grid gap-3">
        <form method="get" className="flex flex-wrap items-center gap-2">
          <select name="car" defaultValue={carId ?? ""} aria-label={t("Gari", "Car")} className="input w-auto min-w-0 flex-1 sm:flex-none">
            <option value="">{t("Magari yote", "All cars")}</option>
            {cars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.plate}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-ghost">
            {t("Chuja", "Filter")}
          </button>
        </form>
        <p className="text-sm text-muted">
          {total === 1 ? t("Rekodi 1", "1 record") : t(`Rekodi ${total}`, `${total} records`)}
          {rows.length > 0 && t(` · ukurasa huu ${formatMoney(pageTotal)}`, ` · this page ${formatMoney(pageTotal)}`)}
        </p>
        <IncomeList incomes={rows} empty={t("Hakuna mapato hapa.", "No income here.")} edit={{ cars, today: todayInTanzania() }} />
        <Pager page={page} total={total} pageSize={INCOME_PAGE_SIZE} params={carId ? { car: String(carId) } : {}} />
      </section>
    </main>
  );
}
