import { formatMoney } from "@/lib/format";

// A dashboard tile's extra lines: approved money still with the factory manager, and authorised
// money the mhasibu hasn't paid out yet.
export function AwaitingIssue({
  authorisation,
  issue,
}: {
  authorisation: { count: number; total: string };
  issue: { count: number; total: string };
}) {
  return (
    <>
      {authorisation.count > 0 && (
        <>
          <br />
          {authorisation.count === 1 ? "1 linasubiri" : `${authorisation.count} yanasubiri`} meneja wa kiwanda (
          {formatMoney(authorisation.total)})
        </>
      )}
      {issue.count > 0 && (
        <>
          <br />
          {issue.count === 1 ? "1 limeidhinishwa" : `${issue.count} yameidhinishwa`}, yanasubiri mhasibu (
          {formatMoney(issue.total)})
        </>
      )}
    </>
  );
}
