// When a new entry looks like one already there. Plain rules, no outside service: the same car,
// an amount within a few percent, and close in time. Kept free of server imports so it can be
// unit tested with node --test; src/lib/duplicates.ts runs the same rules in SQL.

// Amounts this close count as the same (5%: TSh 45,000 against 43,000 to 47,250).
export const DUPLICATE_AMOUNT_SHARE = 0.05;

// How many days apart, either way, two entries may be. Fuel is bought often, so two fuel requests
// only look repeated within two days; other requests within a week; income within three days.
export const DUPLICATE_DAYS = { fuel: 2, other: 7, income: 3 } as const;

// How alike two amounts are, as a whole percentage: 100 when equal.
export function amountLikeness(a: number, b: number): number {
  const larger = Math.max(Math.abs(a), Math.abs(b));
  if (larger === 0) return 100;
  return Math.round((1 - Math.abs(a - b) / larger) * 100);
}

export const amountsMatch = (a: number, b: number) => Math.abs(a - b) <= DUPLICATE_AMOUNT_SHARE * Math.max(a, b);

// Reads the id of the match the person already saw and chose to send anyway; null when none.
export function parseDuplicateOk(input: FormDataEntryValue | null): number | null {
  const id = Number(input);
  return typeof input === "string" && Number.isInteger(id) && id > 0 ? id : null;
}

// The earlier entry a new one resembles, as the warning and the reviewers' flag describe it.
export type DuplicateMatch = {
  id: number;
  amount: string;
  at: Date;
  who: string | null;
  plate: string | null;
  text: string | null;
  backfilled: boolean;
  // How alike the amounts are, in percent.
  likeness: number;
};
