import { getT } from "@/lib/lang";
import { formatMoney } from "@/lib/format";

// A dashboard tile's extra lines: approved money still with the factory manager, and authorised
// money the mhasibu hasn't paid out yet.
export async function AwaitingIssue({
  authorisation,
  issue,
}: {
  authorisation: { count: number; total: string };
  issue: { count: number; total: string };
}) {
  const t = await getT();
  return (
    <>
      {authorisation.count > 0 && (
        <>
          <br />
          {t(
            authorisation.count === 1 ? "1 linasubiri meneja wa kiwanda" : `${authorisation.count} yanasubiri meneja wa kiwanda`,
            `${authorisation.count} awaiting the factory manager`,
          )}{" "}
          ({formatMoney(authorisation.total)})
        </>
      )}
      {issue.count > 0 && (
        <>
          <br />
          {t(
            `${issue.count === 1 ? "1 limeidhinishwa" : `${issue.count} yameidhinishwa`}, yanasubiri mhasibu`,
            `${issue.count} authorised, awaiting the accountant`,
          )}{" "}
          ({formatMoney(issue.total)})
        </>
      )}
    </>
  );
}
