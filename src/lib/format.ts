import { TIME_ZONE } from "@/lib/time";

// Tanzanian shillings, shown without cents: "TSh 40,000".
const money = new Intl.NumberFormat("sw-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat("sw-TZ", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: TIME_ZONE,
});

// pg returns numeric columns as strings to avoid precision loss.
export const formatMoney = (amount: string | number) => money.format(Number(amount));
// A big figure may wrap on a phone; a real minus sign stays on the same line as the amount.
export const keepMinus = (s: string) => s.replace(/^-/, "\u2212");
export const formatDateTime = (d: Date) => dateTime.format(d);
// History typed in later has a day but no real time of day.
const dateOnly = new Intl.DateTimeFormat("sw-TZ", { dateStyle: "medium", timeZone: TIME_ZONE });
export const formatDate = (d: Date) => dateOnly.format(d);

// Report rows already carry Tanzanian wall time as "YYYY-MM-DD HH:MI"; read it as UTC so it isn't shifted again.
const wallTime = new Intl.DateTimeFormat("sw-TZ", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
export const formatWallTime = (local: string) => wallTime.format(new Date(`${local.replace(" ", "T")}:00Z`));
const wallDate = new Intl.DateTimeFormat("sw-TZ", { dateStyle: "medium", timeZone: "UTC" });
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

// Cargo income: "Tani 28.5 × TSh 45,000 · Mwanza". Tonnes keep up to two decimals, no trailing zeros.
const tonnesFormat = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });
export const formatTonnes = (tonnes: string | number) => tonnesFormat.format(Number(tonnes));
// Null for income that isn't cargo.
export const cargoLine = (c: { tonnes: string | null; rate_per_tonne: number | null; destination: string | null }) =>
  c.tonnes === null || c.rate_per_tonne === null
    ? null
    : `Tani ${formatTonnes(c.tonnes)} × ${formatMoney(c.rate_per_tonne)}${c.destination ? ` · ${c.destination}` : ""}`;
