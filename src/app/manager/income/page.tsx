import { sourceLabel } from "@/lib/reports";
import { getT } from "@/lib/lang";
import Link from "next/link";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { formatMoney } from "@/lib/format";
import { DELETE_WINDOW_HOURS, getIncomeTotals, listDebts, listIncomes } from "@/lib/incomes";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { listCars, todayInTanzania } from "@/lib/reports";
import { requireUser } from "@/lib/session";
import { DebtPayment, DebtToasts } from "./debt-payment";
import { IncomeList } from "./income-list";

const RECENT = 5;

// A pointer to invoices (the only way income comes in), then one card with the last few entries and the clients' debts as tabs. Everything else
// lives on the history page. The tab lives in the URL so live refreshes keep it.
export default async function IncomePage({ searchParams }: PageProps<"/manager/income">) {
  const manager = await requireUser("manager");
  const t = await getT();
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
        title={t("Mapato", "Income")}
        description={
          t(
            `Mwezi huu ${formatMoney(totals.this_month)} · mwezi uliopita ${formatMoney(totals.last_month)}`,
            `This month ${formatMoney(totals.this_month)} · last month ${formatMoney(totals.last_month)}`,
          ) + (totals.debts > 0 ? t(` · wateja wanadaiwa ${formatMoney(totals.owed)}`, ` · clients owe ${formatMoney(totals.owed)}`) : "")
        }
      />

      <section className="card flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">{t("Mapato yanatoka kwenye invoice", "Income comes from invoices")}</h2>
          <p className="text-sm text-muted">
            {t(
              "Tengeneza invoice kwa kila kazi: safari zake zinaingia hapa zenyewe, kama deni la mteja hadi alipe.",
              "Make an invoice for each job: its trips land here by themselves, as the client's debt until they pay.",
            )}
          </p>
        </div>
        <Link href="/manager/invoices/new" className="btn btn-primary">
          {t("Tengeneza invoice", "Make an invoice")}
        </Link>
      </section>

      <section className="card grid gap-3">
        <nav className="-mx-4 -mt-4 flex border-b border-line sm:-mx-5 sm:-mt-5" aria-label={t("Mapato ya karibuni au madeni", "Recent income or debts")}>
          {(
            [
              { key: "karibuni", label: t("Ya karibuni", "Recent"), count: null, href: "/manager/income" },
              { key: "madeni", label: t("Madeni", "Debts"), count: debts.length, href: "/manager/income?tab=madeni" },
            ] as const
          ).map((x) => (
            <Link
              key={x.key}
              href={x.href}
              scroll={false}
              aria-current={tab === x.key ? "page" : undefined}
              className="flex flex-1 items-center justify-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted hover:text-foreground aria-[current=page]:border-accent aria-[current=page]:text-foreground"
            >
              {x.label}
              {x.count !== null && <span className="rounded-full bg-background px-2 text-xs tabular-nums">{x.count}</span>}
            </Link>
          ))}
        </nav>

        {tab === "karibuni" ? (
          <>
            <p className="text-sm text-muted">
              {t(
                `Umekosea? Bonyeza Badilisha kurekebisha mapato, au uyafute ndani ya saa ${DELETE_WINDOW_HOURS}. Mkurugenzi ataona yaliyofutwa na yaliyobadilishwa.`,
                `A mistake? Press Edit to correct the income, or delete it within ${DELETE_WINDOW_HOURS} hours. The director sees what was deleted and changed.`,
              )}
            </p>
            <IncomeList incomes={recent.rows} empty={t("Bado hakuna mapato. Tengeneza invoice ya kwanza.", "No income yet. Make the first invoice.")} edit={{ cars, today: todayInTanzania() }} />
            {recent.total > RECENT && (
              <p className="text-sm">
                <Link href="/manager/income/history" className="font-medium text-accent underline">
                  {t("Historia ya mapato yote", "History of all income")} ({recent.total}) →
                </Link>
              </p>
            )}
          </>
        ) : (
          <>
            {debts.length > 0 && (
              <p className="text-sm text-muted">
                {t(
                  `Wateja wanadaiwa ${formatMoney(totals.owed)}, ya zamani juu. Mteja akilipa, bonyeza Pokea malipo.`,
                  `Clients owe ${formatMoney(totals.owed)}, oldest first. When a client pays, press Take payment.`,
                )}
              </p>
            )}
            <DebtToasts>
              <IncomeList
                incomes={debts}
                empty={`${t("Madeni yote yamelipwa.", "All debts are paid.")} 👍`}
                action={(i) => (
                  <DebtPayment
                    incomeId={i.id}
                    customer={i.customer_name ?? sourceLabel(i.source, t)}
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
