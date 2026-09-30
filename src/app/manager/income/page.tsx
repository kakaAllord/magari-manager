import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { formatDateTime, formatMoney } from "@/lib/format";
import { DELETE_WINDOW_HOURS, getIncomeTotals, listIncomes } from "@/lib/incomes";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { requireUser } from "@/lib/session";
import { DeleteIncome } from "./delete-income";
import { IncomeForm } from "./income-form";

export default async function IncomePage() {
  const manager = await requireUser("manager");
  const [incomes, totals] = await Promise.all([listIncomes(manager.id), getIncomeTotals()]);

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader
        title="Mapato"
        description={`Mwezi huu ${formatMoney(totals.this_month)} · mwezi uliopita ${formatMoney(totals.last_month)}`}
      />

      <section className="card">
        <h2 className="mb-4 text-lg font-semibold">Rekodi mapato</h2>
        <IncomeForm />
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold">Mapato ya karibuni</h2>
        <p className="mb-2 text-sm text-muted">
          Umekosea? Unaweza kufuta mapato uliyorekodi ndani ya saa {DELETE_WINDOW_HOURS}. Mkurugenzi ataona yaliyofutwa.
        </p>
        {incomes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Bado hakuna mapato. Rekodi ya kwanza hapo juu.</p>
        ) : (
          <ul className="divide-y divide-line">
            {incomes.map((i) => (
              <li key={i.id} className="grid gap-2 py-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium break-words">{i.source}</p>
                    {i.description && <p className="text-sm break-words">{i.description}</p>}
                    <p className="mt-1 text-xs text-muted">
                      {formatDateTime(i.created_at)} · Imerekodiwa na {i.recorder_name ?? "meneja"}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-ok tabular-nums">+{formatMoney(i.amount)}</p>
                </div>
                {i.can_delete && <DeleteIncome incomeId={i.id} source={i.source} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
