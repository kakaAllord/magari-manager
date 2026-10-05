import Link from "next/link";
import type { FuelOverview } from "@/lib/fuel";
import { formatMoney, formatRate, keepMinus } from "@/lib/format";
import type { CarMoney } from "@/lib/stats";

const valueColor = { ok: "text-ok", warn: "text-warn", danger: "text-danger" };

// A dashboard figure with a line or two under it. `href` makes the whole tile a link.
export function StatTile({
  label,
  value,
  tone,
  href,
  children,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "danger";
  href?: string;
  children: React.ReactNode;
}) {
  const body = (
    <>
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className={`figure mt-1 ${tone ? valueColor[tone] : ""}`}>{keepMinus(value)}</p>
      <p className="mt-1 text-xs text-muted">{children}</p>
    </>
  );
  const className = `card @container block ${tone === "warn" ? "border-warn/50 bg-warn-soft" : ""}`;
  return href ? (
    <Link href={href} className={`${className} hover:border-accent`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

// This month's income, spending and balance for every car, with its driver.
export function CarMoneyCard({
  cars,
  income,
  spend,
  reportHref,
}: {
  cars: CarMoney[];
  income: string;
  spend: string;
  reportHref: string;
}) {
  const balance = Number(income) - Number(spend);
  // The "no car" row only shows when something was booked without a car this month.
  const rows = cars.filter((c) => c.id !== null || Number(c.income) || Number(c.spend));
  const sub = (c: CarMoney) => (c.id === null ? null : [c.car, c.driver ?? "Hana dereva"].filter(Boolean).join(" · "));

  return (
    <section className="card">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">Kila gari mwezi huu</h2>
        <Link href={reportHref} className="text-sm font-medium text-accent underline">
          Ripoti kamili →
        </Link>
      </div>
      {/* Phones: four money columns don't fit, so each car is a row with its balance on the right. */}
      <ul className="divide-y divide-line text-sm sm:hidden">
        {rows.map((c) => {
          const net = Number(c.income) - Number(c.spend);
          return (
            <li key={c.id ?? "none"} className="py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {c.plate ? <span className="plate">{c.plate}</span> : "Bila gari"}
                  {sub(c) && <span className="ml-2 text-xs text-muted">{sub(c)}</span>}
                </div>
                <span className={`shrink-0 font-semibold tabular-nums ${net < 0 ? "text-danger" : "text-ok"}`}>
                  {formatMoney(net)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted tabular-nums">
                Mapato <span className="text-ok">{formatMoney(c.income)}</span> · Matumizi{" "}
                <span className="text-foreground">{formatMoney(c.spend)}</span>
              </p>
            </li>
          );
        })}
        <li className="flex items-start justify-between gap-3 py-2.5 font-semibold">
          Jumla
          <span className={`tabular-nums ${balance < 0 ? "text-danger" : "text-ok"}`}>{formatMoney(balance)}</span>
        </li>
      </ul>
      <div className="hidden overflow-x-auto sm:block">
        <table className="table">
          <thead>
            <tr>
              <th>Gari</th>
              <th className="num">Mapato</th>
              <th className="num">Matumizi</th>
              <th className="num">Salio</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const net = Number(c.income) - Number(c.spend);
              return (
                <tr key={c.id ?? "none"}>
                  <td>
                    {c.plate ? <span className="plate">{c.plate}</span> : "Bila gari"}
                    {sub(c) && <span className="mt-0.5 block text-xs text-muted">{sub(c)}</span>}
                  </td>
                  <td className="num text-ok">{formatMoney(c.income)}</td>
                  <td className="num">{formatMoney(c.spend)}</td>
                  <td className={`num font-medium ${net < 0 ? "text-danger" : "text-ok"}`}>{formatMoney(net)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>Jumla</td>
              <td className="num text-ok">{formatMoney(income)}</td>
              <td className="num">{formatMoney(spend)}</td>
              <td className={`num ${balance < 0 ? "text-danger" : "text-ok"}`}>{formatMoney(balance)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

// The last 30 days of fuel: km per litre for each car.
export function FuelCard({ fuel, href }: { fuel: FuelOverview; href: string }) {
  return (
    <section className="card">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">Mafuta, siku 30</h2>
        <Link href={href} className="text-sm font-medium text-accent underline">
          Zaidi →
        </Link>
      </div>
      <p className="text-sm text-muted">
        Km {fuel.all.km.toLocaleString("en")} · wastani {formatRate(fuel.all.kmPerLitre)} km/L
        {fuel.all.costPerKm !== null && ` · ${formatMoney(fuel.all.costPerKm)} kwa km`}
      </p>
      <ul className="mt-2 divide-y divide-line">
        {fuel.cars.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="min-w-0">
              <span className="plate">{c.plate}</span>
              <span className="ml-2 text-muted">{c.driver ?? "Hana dereva"}</span>
            </span>
            <span className="shrink-0 text-right tabular-nums">
              <span className="font-semibold">{formatRate(c.totals.kmPerLitre)}</span>
              <span className="text-xs text-muted"> km/L</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
