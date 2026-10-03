// Pure fuel arithmetic, kept free of server imports so it can be unit tested with node --test.
//
// Between two readings of a car: km = odometer difference, and
// fuel used = fuel in the tank at the first + fuel paid for in between - fuel at the second.
// The stretch belongs to the driver of the first reading (who drove on from it).

export type Reading = { id: number; at: number; odometer: number; eighths: number; driverId: number | null };
// One paid fuel request. `litres` is null when no price per litre was known.
export type Fill = { at: number; amount: number; litres: number | null };

// thirsty: far fewer km per litre than the car usually does.
// gained: the tank rose by more than a gauge mark with nothing paid for.
// idle: a quarter tank or more gone while the car barely moved.
export type Flag = "thirsty" | "gained" | "idle";

// How each flag is explained: a short label for tables, a sentence for the stretch list.
export const flagText: Record<Flag, { short: string; long: string }> = {
  thirsty: { short: "Matumizi makubwa", long: "Km kwa lita chini sana ya kawaida ya gari hili" },
  gained: { short: "Mafuta yaliongezeka", long: "Tanki lilijaa zaidi bila malipo ya mafuta. Angalia vipimo" },
  idle: { short: "Mafuta yalipotea", long: "Robo tanki au zaidi lilipungua gari likiwa limesimama" },
};

export type Stretch = {
  from: Reading;
  to: Reading;
  driverId: number | null;
  km: number;
  litresAdded: number;
  litresUsed: number;
  kmPerLitre: number | null;
  cost: number;
  flag: Flag | null;
};

// Gauge marks, in eighths of a tank.
export const GAUGE = [
  { eighths: 0, short: "E", label: "Tupu" },
  { eighths: 1, short: "⅛", label: "⅛" },
  { eighths: 2, short: "¼", label: "Robo" },
  { eighths: 3, short: "⅜", label: "⅜" },
  { eighths: 4, short: "½", label: "Nusu" },
  { eighths: 5, short: "⅝", label: "⅝" },
  { eighths: 6, short: "¾", label: "Robo tatu" },
  { eighths: 7, short: "⅞", label: "⅞" },
  { eighths: 8, short: "F", label: "Imejaa" },
] as const;

export const gaugeLabel = (eighths: number) => {
  const g = GAUGE[eighths];
  return g.short === g.label ? `${g.label} ya tanki` : g.label;
};

// A stretch counts as thirsty when it gets less than this share of the car's usual km per litre.
export const THIRSTY_SHARE = 0.7;
// Shorter stretches are too dependent on how the gauge was read to judge.
export const MIN_KM_TO_JUDGE = 50;

const median = (xs: number[]) => {
  const s = xs.toSorted((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

// `readings` and `fills` are for one car. A fill belongs to the stretch it was paid in, so fuel paid
// before the first reading is not counted, and fuel paid after the last waits for the next reading.
export function stretchesFor(readings: Reading[], fills: Fill[], tankLitres: number, fallbackPrice: number | null) {
  const rs = readings.toSorted((a, b) => a.at - b.at || a.id - b.id);
  const fs = fills.toSorted((a, b) => a.at - b.at);
  const litresAt = (r: Reading) => (tankLitres * r.eighths) / 8;
  let price = fallbackPrice;
  const out: Stretch[] = [];

  for (let i = 1; i < rs.length; i++) {
    const from = rs[i - 1];
    const to = rs[i];
    const paid = fs.filter((f) => f.at > from.at && f.at <= to.at);
    const litresAdded = paid.reduce((s, f) => s + (f.litres ?? 0), 0);
    const amount = paid.reduce((s, f) => s + (f.litres === null ? 0 : f.amount), 0);
    if (litresAdded > 0) price = amount / litresAdded;

    const km = to.odometer - from.odometer;
    const litresUsed = litresAt(from) + litresAdded - litresAt(to);
    out.push({
      from,
      to,
      driverId: from.driverId,
      km,
      litresAdded,
      litresUsed,
      kmPerLitre: km > 0 && litresUsed > 0 ? km / litresUsed : null,
      cost: price === null ? 0 : Math.max(litresUsed, 0) * price,
      flag: null,
    });
  }

  // Judge each stretch against the car's other stretches, so one bad stretch can't hide itself.
  const mark = tankLitres / 8;
  for (const s of out) {
    if (s.litresUsed < -mark) s.flag = "gained";
    else if (s.km < 20 && s.litresUsed >= tankLitres / 4) s.flag = "idle";
    else if (s.kmPerLitre !== null && s.km >= MIN_KM_TO_JUDGE) {
      const others = out.filter((o) => o !== s && o.kmPerLitre !== null && o.km >= MIN_KM_TO_JUDGE);
      if (others.length && s.kmPerLitre < THIRSTY_SHARE * median(others.map((o) => o.kmPerLitre!))) {
        s.flag = "thirsty";
      }
    }
  }
  return out;
}

export type Totals = {
  km: number;
  litres: number;
  cost: number;
  kmPerLitre: number | null;
  costPerKm: number | null;
  stretches: number;
  flagged: number;
};

// Adding up consecutive stretches cancels out most gauge misreadings: each reading's error
// is added to one stretch and taken off the next.
export function totalsOf(stretches: Stretch[]): Totals {
  const km = stretches.reduce((s, x) => s + x.km, 0);
  const litres = stretches.reduce((s, x) => s + x.litresUsed, 0);
  const cost = stretches.reduce((s, x) => s + x.cost, 0);
  return {
    km,
    litres,
    cost,
    kmPerLitre: km > 0 && litres > 0 ? km / litres : null,
    costPerKm: km > 0 && cost > 0 ? cost / km : null,
    stretches: stretches.length,
    flagged: stretches.filter((x) => x.flag).length,
  };
}
