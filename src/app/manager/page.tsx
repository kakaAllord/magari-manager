import Link from "next/link";
import { Header } from "@/components/header";
import { formatMoney } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { getMonthlySpend, getOverview, getSpendByCarThisMonth } from "@/lib/stats";
import { TIME_ZONE } from "@/lib/time";
import { managerLinks } from "./nav";
import { SpendChart } from "./spend-chart";

const today = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeZone: TIME_ZONE });

export default async function DashboardPage() {
  const user = await requireUser("manager");
  const [o, monthly, byCar] = await Promise.all([getOverview(), getMonthlySpend(6), getSpendByCarThisMonth()]);
  const spentCars = byCar.filter((c) => Number(c.total) > 0).length;

  return (
    <>
      <Header user={user} links={managerLinks} />
      <main className="page">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted">{today.format(new Date())}</p>
        </div>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Summary">
          <Tile label="Spent this month" value={formatMoney(o.this_month)}>
            This week {formatMoney(o.this_week)}
            <br />
            Last month {formatMoney(o.last_month)}
          </Tile>
          <Tile
            label="Waiting for approval"
            value={String(o.pending_count)}
            tone={o.pending_count > 0 ? "warn" : undefined}
            href="/manager/requests"
          >
            {o.pending_count > 0 ? `${formatMoney(o.pending_total)} requested · Review` : "All caught up"}
          </Tile>
          <Tile label="Cars" value={String(o.cars)} href="/manager/cars">
            {o.cars_without_driver === 0 ? "All have a driver" : `${o.cars_without_driver} without a driver`}
          </Tile>
          <Tile label="Drivers" value={String(o.drivers)} href="/manager/drivers">
            {o.drivers_without_car === 0 ? "All have a car" : `${o.drivers_without_car} without a car`}
          </Tile>
        </section>

        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <section className="card">
            <h2 className="font-semibold">Spending per month</h2>
            <p className="mb-4 text-sm text-muted">
              Approved requests, last 6 months · {formatMoney(o.all_time)} all time
            </p>
            <SpendChart data={monthly} />
          </section>

          <section className="card">
            <h2 className="font-semibold">This month by car</h2>
            <p className="mb-3 text-sm text-muted">
              {spentCars} of {byCar.length} cars have spending this month
            </p>
            {byCar.length === 0 ? (
              <p className="text-sm text-muted">No cars yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="sr-only">
                  <tr>
                    <th>Car</th>
                    <th>Spent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {byCar.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 pr-2">
                        <span className="plate">{c.plate}</span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {c.car} · {c.driver ?? "No driver"}
                        </span>
                      </td>
                      <td className="py-2 text-right align-top tabular-nums">
                        <span className="font-medium">{formatMoney(c.total)}</span>
                        <span className="block text-xs text-muted">
                          {c.count} {c.count === 1 ? "request" : "requests"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

function Tile({
  label,
  value,
  tone,
  href,
  children,
}: {
  label: string;
  value: string;
  tone?: "warn";
  href?: string;
  children: React.ReactNode;
}) {
  const body = (
    <>
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums sm:text-2xl ${tone === "warn" ? "text-warn" : ""}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{children}</p>
    </>
  );
  const className = `card block ${tone === "warn" ? "border-warn/50 bg-warn-soft" : ""}`;
  return href ? (
    <Link href={href} className={`${className} hover:border-accent`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
