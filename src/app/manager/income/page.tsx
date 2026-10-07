import Link from "next/link";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { formatMoney } from "@/lib/format";
import { DELETE_WINDOW_HOURS, getIncomeTotals, listDebts, listIncomes } from "@/lib/incomes";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { listCars, todayInTanzania } from "@/lib/reports";
import { requireUser } from "@/lib/session";
import { DebtPayment, DebtToasts } from "./debt-payment";
import { IncomeForm } from "./income-form";
import { IncomeList } from "./income-list";

const RECENT = 5;

// The form, then one card with the last few entries and the clients' debts as tabs. Everything else
// lives on the history page. The tab lives in the URL so live refreshes keep it.
export default async function IncomePage({ searchParams }: PageProps<"/manager/income">) {
  const manager = await requireUser("manager");
  const tab = (await searchParams).tab === "madeni" ? "madeni" : "karibuni";
  const [recent, totals, cars, debts] = await Promise.all([
    listIncomes(manager.id, { limit: RECENT, byEntry: true }),
    getIncomeTotals(),
    listCars(),
    listDebts(),
  ]);

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader
        title="Mapato"
        description={
          `Mwezi huu ${formatMoney(totals.this_month)} · mwezi uliopita ${formatMoney(totals.last_month)}` +
          (totals.debts > 0 ? ` · wateja wanadaiwa ${formatMoney(totals.owed)}` : "")
        }
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

      <section className="card grid gap-3">
        <nav className="-mx-4 -mt-4 flex border-b border-line sm:-mx-5 sm:-mt-5" aria-label="Mapato ya karibuni au madeni">
          {(
            [
              { key: "karibuni", label: "Ya karibuni", count: null, href: "/manager/income" },
              { key: "madeni", label: "Madeni", count: debts.length, href: "/manager/income?tab=madeni" },
            ] as const
          ).map((t) => (
            <Link
              key={t.key}
              href={t.href}
              scroll={false}
              aria-current={tab === t.key ? "page" : undefined}
              className="flex flex-1 items-center justify-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted hover:text-foreground aria-[current=page]:border-accent aria-[current=page]:text-foreground"
            >
              {t.label}
              {t.count !== null && <span className="rounded-full bg-background px-2 text-xs tabular-nums">{t.count}</span>}
            </Link>
          ))}
        </nav>

        {tab === "karibuni" ? (
          <>
            <p className="text-sm text-muted">
              Umekosea? Unaweza kufuta mapato uliyorekodi ndani ya saa {DELETE_WINDOW_HOURS}. Mkurugenzi ataona yaliyofutwa.
            </p>
            <IncomeList incomes={recent.rows} empty="Bado hakuna mapato. Rekodi ya kwanza hapo juu." />
            {recent.total > RECENT && (
              <p className="text-sm">
                <Link href="/manager/income/history" className="font-medium text-accent underline">
                  Historia ya mapato yote ({recent.total}) →
                </Link>
              </p>
            )}
          </>
        ) : (
          <>
            {debts.length > 0 && (
              <p className="text-sm text-muted">
                Wateja wanadaiwa {formatMoney(totals.owed)}, ya zamani juu. Mteja akilipa, bonyeza Pokea malipo.
              </p>
            )}
            <DebtToasts>
              <IncomeList
                incomes={debts}
                empty="Madeni yote yamelipwa. 👍"
                action={(i) => (
                  <DebtPayment
                    incomeId={i.id}
                    customer={i.customer_name ?? i.source}
                    owed={Number(i.amount) - Number(i.amount_paid)}
                  />
                )}
              />
            </DebtToasts>
          </>
        )}
      </section>
    </main>
  );
}
