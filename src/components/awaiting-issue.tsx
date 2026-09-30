import { formatMoney } from "@/lib/format";

// A dashboard tile's second line: approved money the mhasibu hasn't paid out yet.
export function AwaitingIssue({ count, total }: { count: number; total: string }) {
  if (count === 0) return null;
  return (
    <>
      <br />
      {count === 1 ? "1 limekubaliwa" : `${count} yamekubaliwa`}, yanasubiri mhasibu ({formatMoney(total)})
    </>
  );
}
