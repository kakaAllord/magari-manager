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
export const formatDateTime = (d: Date) => dateTime.format(d);

// Report rows already carry Tanzanian wall time as "YYYY-MM-DD HH:MI"; read it as UTC so it isn't shifted again.
const wallTime = new Intl.DateTimeFormat("sw-TZ", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
export const formatWallTime = (local: string) => wallTime.format(new Date(`${local.replace(" ", "T")}:00Z`));

// Compact axis labels: 1,250,000 -> "1.3M", 40,000 -> "40K".
export const formatCompact = (amount: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(amount);

// Fuel figures: "45,500", "27.5", and a dash when there's nothing to measure.
const whole = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("en", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const formatKm = (km: number) => whole.format(km);
export const formatLitres = (litres: number) => oneDecimal.format(litres);
export const formatRate = (rate: number | null) => (rate === null ? "–" : oneDecimal.format(rate));
