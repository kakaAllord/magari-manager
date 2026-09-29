const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: process.env.CURRENCY ?? "USD",
});

const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

// pg returns numeric columns as strings to avoid precision loss.
export const formatMoney = (amount: string) => money.format(Number(amount));
export const formatDateTime = (d: Date) => dateTime.format(d);
