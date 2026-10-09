import { TIME_ZONE } from "@/lib/time";

// Tanzanian shillings, shown without cents: "TSh 40,000".
const money = new Intl.NumberFormat("sw-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

// Dates are always day/month/year ("09/10/2026") and times 24-hour ("14:30"); en-GB gives that order.
const DAY = { day: "2-digit", month: "2-digit", year: "numeric" } as const;
const TIME = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" } as const;
const dateTime = new Intl.DateTimeFormat("en-GB", { ...DAY, ...TIME, timeZone: TIME_ZONE });

// pg returns numeric columns as strings to avoid precision loss.
export const formatMoney = (amount: string | number) => money.format(Number(amount));
// A big figure may wrap on a phone; a real minus sign stays on the same line as the amount.
export const keepMinus = (s: string) => s.replace(/^-/, "\u2212");
export const formatDateTime = (d: Date) => dateTime.format(d);
// History typed in later has a day but no real time of day.
const dateOnly = new Intl.DateTimeFormat("en-GB", { ...DAY, timeZone: TIME_ZONE });
export const formatDate = (d: Date) => dateOnly.format(d);
// Dashboard heading: "Ijumaa, 09/10/2026".
const weekday = new Intl.DateTimeFormat("sw-TZ", { weekday: "long", timeZone: TIME_ZONE });
export const formatToday = () => {
  const now = new Date();
  return `${weekday.format(now)}, ${dateOnly.format(now)}`;
};

// Report rows already carry Tanzanian wall time as "YYYY-MM-DD HH:MI"; read it as UTC so it isn't shifted again.
const wallTime = new Intl.DateTimeFormat("en-GB", { ...DAY, ...TIME, timeZone: "UTC" });
export const formatWallTime = (local: string) => wallTime.format(new Date(`${local.replace(" ", "T")}:00Z`));
const wallDate = new Intl.DateTimeFormat("en-GB", { ...DAY, timeZone: "UTC" });
export const formatWallDate = (local: string) => wallDate.format(new Date(`${local.slice(0, 10)}T00:00:00Z`));

// Compact axis labels: 1,250,000 -> "1.3M", 40,000 -> "40K".
export const formatCompact = (amount: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(amount);

// Fuel figures: "45,500", "27.5", and a dash when there's nothing to measure.
const whole = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("en", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const formatKm = (km: number) => whole.format(km);
export const formatLitres = (litres: number) => oneDecimal.format(litres);
export const formatRate = (rate: number | null) => (rate === null ? "–" : oneDecimal.format(rate));

// Cargo is kept in tonnes; `unit` is how the meneja typed it, so it's shown back that way:
// "Tani 28.5 × TSh 45,000" or "Kilo 1,250.5 × TSh 52.25". Quantities and prices keep up to two
// decimals, no trailing zeros.
const twoDecimals = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });
const price = new Intl.NumberFormat("sw-TZ", { style: "currency", currency: "TZS", minimumFractionDigits: 0, maximumFractionDigits: 2 });
export type Cargo = { tonnes: string | number; rate_per_tonne: string | number; unit: string };
const inKilos = (c: Cargo) => c.unit === "kg";
// "28.5" or "1,250.5", in the unit it was typed in.
export const formatQuantity = (c: Cargo) => twoDecimals.format(Number(c.tonnes) * (inKilos(c) ? 1000 : 1));
// The price for one tonne or one kilo: "TSh 45,000", "TSh 52.25".
export const formatUnitPrice = (c: Cargo) => price.format(Number(c.rate_per_tonne) / (inKilos(c) ? 1000 : 1));
export const unitName = (c: Cargo) => (inKilos(c) ? "Kilo" : "Tani");
export const cargoSum = (c: Cargo) => `${unitName(c)} ${formatQuantity(c)} × ${formatUnitPrice(c)}`;
// Null for income that isn't cargo.
export const cargoLine = (c: { tonnes: string | null; rate_per_tonne: string | null; unit: string; destination: string | null }) =>
  c.tonnes === null || c.rate_per_tonne === null
    ? null
    : `${cargoSum({ tonnes: c.tonnes, rate_per_tonne: c.rate_per_tonne, unit: c.unit })}${c.destination ? ` · ${c.destination}` : ""}`;
