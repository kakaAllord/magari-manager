import { getT } from "@/lib/lang";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { Pager, pageFrom } from "@/components/pager";
import { VoucherPeriod } from "@/components/voucher-period";
import { formatDate, formatMoney } from "@/lib/format";
import { formatDay, parseReportParams, presets } from "@/lib/report-params";
import { todayInTanzania } from "@/lib/reports";
import { listVouchers, MAX_VOUCHERS_PER_PDF, PAGE_SIZE } from "@/lib/requests";
import { choiceLabel, paymentMethod } from "@/lib/voucher-fields";

type SearchParams = Record<string, string | string[] | undefined>;

// Payment vouchers: every payment's voucher for a period (this month by default), newest first, with
// one download each and one button for all of them in a single PDF. Shared by every staff role.
export async function VoucherList({ searchParams }: { searchParams: SearchParams }) {
  const t = await getT();
  const today = todayInTanzania();
  const { from, to } = parseReportParams(searchParams, today);
  const page = pageFrom(searchParams);
  const { rows, total, sum } = await listVouchers(from, to, page);
  const all = `/vouchers/pdf?${new URLSearchParams({ from, to })}`;
  const tooMany = total > MAX_VOUCHERS_PER_PDF;

  return (
    <main className="page">
      <PageHeader
        title="Payment vouchers"
        description={t(
          "Kila pesa iliyotoka ina payment voucher yake. Pakua moja, au zote za kipindi kwenye PDF moja.",
          "Every payment has its payment voucher. Download one, or all of a period in one PDF.",
        )}
      />
      {/* One shrinkable column, so a long name or reason truncates instead of widening the card. */}
      <section className="card grid grid-cols-1 gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <VoucherPeriod presets={presets(today, t)} from={from} to={to} today={today} />
          {total > 0 && !tooMany && (
            <a href={all} target="_blank" className="btn btn-primary gap-2">
              <Icon name="pdf" className="size-4" />
              {t("Pakua zote", "Download all")} ({total})
            </a>
          )}
        </div>
        <p className="text-sm text-muted">
          {formatDay(from)} {t("hadi", "to")} {formatDay(to)} ·{" "}
          {total === 0
            ? t("hakuna voucher", "no vouchers")
            : t(`voucher ${total} · jumla ${formatMoney(sum)}`, `${total} vouchers · total ${formatMoney(sum)}`)}
          {tooMany &&
            t(
              ` · Kwa PDF moja chagua kipindi chenye voucher zisizozidi ${MAX_VOUCHERS_PER_PDF}.`,
              ` · For one PDF, pick a period with at most ${MAX_VOUCHERS_PER_PDF} vouchers.`,
            )}
        </p>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{t("Hakuna malipo yaliyotoka katika kipindi hiki.", "No payments went out in this period.")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold tabular-nums">{r.voucher_number}</span>
                    <span className="text-sm text-muted">{r.issued_at ? formatDate(r.issued_at) : ""}</span>
                  </p>
                  <p className="truncate text-sm">
                    {r.requester_name} · {r.reason}
                  </p>
                  <p className="text-xs text-muted">
                    {r.car ?? t("Hakuna gari", "No car")}
                    {r.payment_method && ` · ${choiceLabel(paymentMethod(r.payment_method), t)}`}
                    {r.backfilled_at && t(" · Rekodi ya zamani", " · Past record")}
                  </p>
                </div>
                <span className="shrink-0 font-semibold text-warn tabular-nums">{formatMoney(r.amount)}</span>
                <a
                  href={`/vouchers/${r.id}`}
                  target="_blank"
                  className="btn btn-ghost size-11 shrink-0 rounded-full p-0 sm:size-9"
                  aria-label={t(`Pakua payment voucher ${r.voucher_number}`, `Download payment voucher ${r.voucher_number}`)}
                  title={t("Pakua PDF", "Download PDF")}
                >
                  <Icon name="download" className="size-4" />
                </a>
              </li>
            ))}
          </ul>
        )}
        <Pager page={page} total={total} pageSize={PAGE_SIZE} params={{ from, to }} />
      </section>
    </main>
  );
}
