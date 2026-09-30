import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { formatDateTime, formatMoney } from "@/lib/format";
import { getIncomeTotals, listIncomes } from "@/lib/incomes";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { requireUser } from "@/lib/session";
import { IncomeForm } from "./income-form";

export default async function IncomePage() {
  await requireUser("manager");
  const [incomes, totals] = await Promise.all([listIncomes(), getIncomeTotals()]);

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
        <h2 className="mb-2 text-lg font-semibold">Mapato ya karibuni</h2>
        {incomes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Bado hakuna mapato. Rekodi ya kwanza hapo juu.</p>
        ) : (
          <ul className="divide-y divide-line">
            {incomes.map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-4 py-3.5">
                <div className="min-w-0">
                  <p className="font-medium break-words">{i.source}</p>
                  {i.description && <p className="text-sm break-words">{i.description}</p>}
                  <p className="mt-1 text-xs text-muted">
                    {formatDateTime(i.created_at)} · Imerekodiwa na {i.recorder_name ?? "meneja"}
                  </p>
                </div>
                <p className="shrink-0 font-semibold text-ok tabular-nums">+{formatMoney(i.amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
