import Link from "next/link";
import { CarProfit } from "@/components/car-profit";
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

// This month's faida or hasara for every car, with its driver, from its income and spending.
export function CarMoneyCard({ cars, reportHref }: { cars: CarMoney[]; reportHref: string }) {
  return (
    <section className="card">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">Faida kwa gari, mwezi huu</h2>
        <Link href={reportHref} className="text-sm font-medium text-accent underline">
          Ripoti kamili →
        </Link>
      </div>
      <CarProfit
        rows={cars.map((c) => ({
          key: String(c.id ?? "none"),
          plate: c.plate,
          sub: c.id === null ? null : [c.car, c.driver ?? "Hana dereva"].filter(Boolean).join(" · "),
          income: Number(c.income),
          spend: Number(c.spend),
        }))}
      />
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
