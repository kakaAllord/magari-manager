import Link from "next/link";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { formatMoney } from "@/lib/format";
import { DELETE_WINDOW_HOURS, getIncomeTotals, listIncomes } from "@/lib/incomes";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { listCars, todayInTanzania } from "@/lib/reports";
import { requireUser } from "@/lib/session";
import { IncomeForm } from "./income-form";
import { IncomeList } from "./income-list";

const RECENT = 5;

// The form and the last few entries. Everything else lives on the history page.
export default async function IncomePage() {
  const manager = await requireUser("manager");
  const [recent, totals, cars] = await Promise.all([
    listIncomes(manager.id, { limit: RECENT, byEntry: true }),
    getIncomeTotals(),
    listCars(),
  ]);

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader
        title="Mapato"
        description={`Mwezi huu ${formatMoney(totals.this_month)} · mwezi uliopita ${formatMoney(totals.last_month)}`}
      />

      <section className="card">
        <h2 className="mb-4 text-lg font-semibold">Rekodi mapato</h2>
        {cars.length === 0 ? (
          <p className="text-sm text-muted">
            Mapato yanarekodiwa kwa gari. <Link href="/manager/cars" className="font-medium text-accent underline">Ongeza gari</Link> kwanza.
          </p>
        ) : (
          <IncomeForm cars={cars} today={todayInTanzania()} />
        )}
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold">Mapato ya karibuni</h2>
        <p className="mb-2 text-sm text-muted">
          Umekosea? Unaweza kufuta mapato uliyorekodi ndani ya saa {DELETE_WINDOW_HOURS}. Mkurugenzi ataona yaliyofutwa.
        </p>
        <IncomeList incomes={recent.rows} empty="Bado hakuna mapato. Rekodi ya kwanza hapo juu." />
        {recent.total > RECENT && (
          <p className="mt-3 text-sm">
            <Link href="/manager/income/history" className="font-medium text-accent underline">
              Historia ya mapato yote ({recent.total}) →
            </Link>
          </p>
        )}
      </section>
    </main>
  );
}
