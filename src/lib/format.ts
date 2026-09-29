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

// Compact axis labels: 1,250,000 -> "1.3M", 40,000 -> "40K".
export const formatCompact = (amount: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(amount);
