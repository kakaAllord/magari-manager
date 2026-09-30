import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { Pager, pageFrom } from "@/components/pager";
import { formatMoney } from "@/lib/format";
import { INCOME_PAGE_SIZE, listIncomes } from "@/lib/incomes";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { listCars } from "@/lib/reports";
import { requireUser } from "@/lib/session";
import { IncomeList } from "../income-list";

export default async function IncomeHistoryPage({ searchParams }: PageProps<"/manager/income/history">) {
  const manager = await requireUser("manager");
  const sp = await searchParams;
  const page = pageFrom(sp);
  const carId = Number(sp.car) || null;
  const [{ rows, total }, cars] = await Promise.all([listIncomes(manager.id, { page, carId }), listCars()]);
  const pageTotal = rows.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader title="Historia ya mapato" description="Mapato yote yaliyorekodiwa, mapya juu." />

      <section className="card grid gap-3">
        <form method="get" className="flex flex-wrap items-center gap-2">
          <select name="car" defaultValue={carId ?? ""} aria-label="Gari" className="input w-auto min-w-0 flex-1 sm:flex-none">
            <option value="">Magari yote</option>
            {cars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.plate}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-ghost">
            Chuja
          </button>
        </form>
        <p className="text-sm text-muted">
          {total === 1 ? "Rekodi 1" : `Rekodi ${total}`}
          {rows.length > 0 && ` · ukurasa huu ${formatMoney(pageTotal)}`}
        </p>
        <IncomeList incomes={rows} empty="Hakuna mapato hapa." />
        <Pager page={page} total={total} pageSize={INCOME_PAGE_SIZE} params={carId ? { car: String(carId) } : {}} />
      </section>
    </main>
  );
}
