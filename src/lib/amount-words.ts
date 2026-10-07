// A whole amount of shillings in Swahili words, as a voucher writes it beside the figure:
// 45,500 -> "Shilingi elfu arobaini na tano, mia tano tu". Groups (milioni, laki, elfu, mia) are
// split by commas, so each group reads on its own: 125 is "mia moja ishirini na tano".

const units = ["", "moja", "mbili", "tatu", "nne", "tano", "sita", "saba", "nane", "tisa"];
const tens = ["", "kumi", "ishirini", "thelathini", "arobaini", "hamsini", "sitini", "sabini", "themanini", "tisini"];

function belowHundred(n: number) {
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (t === 0) return units[u];
  return u === 0 ? tens[t] : `${tens[t]} na ${units[u]}`;
}

function belowThousand(n: number) {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h > 0 && `mia ${units[h]}`, rest > 0 && belowHundred(rest)].filter(Boolean).join(" ");
}

export function numberInWords(amount: number): string {
  const n = Math.round(Math.abs(amount));
  if (n === 0) return "sifuri";
  const billions = Math.floor(n / 1e9);
  const millions = Math.floor((n % 1e9) / 1e6);
  const lakhs = Math.floor((n % 1e6) / 1e5);
  const thousands = Math.floor((n % 1e5) / 1e3);
  const rest = n % 1e3;
  return [
    billions > 0 && `bilioni ${belowThousand(billions)}`,
    millions > 0 && `milioni ${belowThousand(millions)}`,
    lakhs > 0 && `laki ${units[lakhs]}`,
    thousands > 0 && `elfu ${belowHundred(thousands)}`,
    rest > 0 && belowThousand(rest),
  ]
    .filter(Boolean)
    .join(", ");
}

export const shillingsInWords = (amount: string | number) => `Shilingi ${numberInWords(Number(amount))} tu`;
