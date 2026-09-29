// Tanzanian shillings, shown without cents: "TSh 40,000".
const money = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

// pg returns numeric columns as strings to avoid precision loss.
export const formatMoney = (amount: string) => money.format(Number(amount));
export const formatDateTime = (d: Date) => dateTime.format(d);
