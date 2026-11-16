// An amount written out in English words for invoices, as on Zuraja's paper invoices (payment
// vouchers use the Swahili words in amount-words.ts):
// 170687729.4 -> "Tanzanian Shillings One Hundred Seventy Million, Six Hundred Eighty-Seven Thousand,
// Seven Hundred Twenty-Nine and Forty Cents Only". Works up to just under a quadrillion (999 trillion).
// Pure, so the invoice form can show it live as well as the page and the PDF.

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
  "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const SCALES = ["", "Thousand", "Million", "Billion", "Trillion"];

// Shillings must stay below a quadrillion: past trillions there is no scale word to say.
const QUADRILLION = 1_000_000_000_000_000;

// 0-99: "Seven", "Forty", "Twenty-Nine".
function belowHundred(n: number) {
  return n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
}

// 1-999: "Seven Hundred Twenty-Nine".
function belowThousand(n: number) {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return [hundreds ? `${ONES[hundreds]} Hundred` : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ");
}

// A whole number in words, its groups of three split by commas; zero is "Zero".
export function numberInEnglish(n: number) {
  if (n === 0) return "Zero";
  const groups: string[] = [];
  for (let scale = 0; n > 0; scale++, n = Math.floor(n / 1000)) {
    const group = n % 1000;
    if (group) groups.unshift([belowThousand(group), SCALES[scale]].filter(Boolean).join(" "));
  }
  return groups.join(", ");
}

// The amount as written on the invoice. Cents are rounded to the nearest one and only said when there are any.
// Returns null for something that isn't a positive amount the words can say.
export function amountInEnglish(amount: string | number) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0 || value >= QUADRILLION) return null;
  // Cents are counted from the fraction alone: whole cents of a trillion-shilling amount would lose precision.
  const fraction = Math.round((value % 1) * 100);
  const shillings = Math.floor(value) + (fraction === 100 ? 1 : 0);
  const cents = fraction % 100;
  if (shillings >= QUADRILLION) return null;
  const parts = [`Tanzanian Shillings ${numberInEnglish(shillings)}`];
  if (cents) parts.push(`${belowHundred(cents)} ${cents === 1 ? "Cent" : "Cents"}`);
  return `${parts.join(" and ")} Only`;
}
