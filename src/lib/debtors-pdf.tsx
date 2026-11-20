import "server-only";
import { Document, Page, renderToBuffer, Text, View } from "@react-pdf/renderer";
import { COMPANY } from "@/lib/company";
import type { DebtorReport } from "@/lib/debtor-data";
import { owedOn, type ClientJob, type Debtor } from "@/lib/debtor-report";
import { cargoLine, formatMoney } from "@/lib/format";
import { C, Kpi, s, Table, type Column } from "@/lib/report-pdf";
import { formatDay } from "@/lib/report-params";

// The debtors report: who owes what, how old it is, and each client's unpaid jobs, to print and hand
// to whoever follows the money up. With `hali=zote` it becomes the clients' accounts (paid jobs too:
// what each job was worth, what came in, what is left), and with `mteja` it covers one client, a
// statement to send them. Same look as the income and spending report.

const money = (n: number) => formatMoney(n);
// Older debts get warmer: amber past 30 days, red past 60.
const ageColor = (days: number) => (days > 60 ? C.danger : days > 30 ? C.out : undefined);
const BAND_COLORS = [C.in, C.outBar, C.out, C.danger];

function DebtorsPdf({ r }: { r: DebtorReport }) {
  const { t } = r;
  const jobsLabel = (n: number) => (n === 1 ? t("kazi 1", "1 job") : t(`kazi ${n}`, `${n} jobs`));
  const title = r.filters.withPaid ? t("Hesabu ya wateja", "Client accounts") : t("Ripoti ya madeni", "Debtors report");
  const paidUp = t("Imelipwa", "Paid");
  // A job or client with nothing left to pay reads "Imelipwa" in green rather than a zero.
  const owedCell = (owed: number) => (owed > 0 ? money(owed) : paidUp);
  const owedColor = (owed: number) => (owed > 0 ? C.out : C.in);

  const summary: Column<Debtor>[] = [
    { label: t("Mteja", "Client"), width: 34, value: (d) => d.customer },
    { label: t("Kazi", "Jobs"), width: 8, num: true, value: (d) => String(d.jobs.length) },
    { label: t("Jumla", "Total"), width: 16, num: true, value: (d) => money(d.amount) },
    { label: t("Amelipa", "Paid"), width: 14, num: true, value: (d) => money(d.paid) },
    { label: t("Deni", "Owed"), width: 16, num: true, value: (d) => owedCell(d.owed), color: (d) => owedColor(d.owed) },
    { label: t("Siku", "Days"), width: 12, num: true, value: (d) => (d.owed > 0 ? String(d.days) : "–"), color: (d) => ageColor(d.days) },
  ];
  const detail: Column<ClientJob>[] = [
    { label: t("Tarehe", "Date"), width: 11, value: (j) => formatDay(j.at) },
    { label: "Invoice", width: 14, value: (j) => j.invoice_number ?? "–" },
    { label: t("Gari", "Car"), width: 11, value: (j) => j.plate ?? t("Bila gari", "No car") },
    { label: t("Maelezo", "Details"), width: 23, value: (j) => [cargoLine(j, t), j.invoice_number ? null : j.description].filter(Boolean).join(" · ") || "–" },
    { label: t("Kiasi", "Amount"), width: 11, num: true, value: (j) => money(j.amount) },
    { label: t("Amelipa", "Paid"), width: 10, num: true, value: (j) => money(j.paid) },
    { label: t("Deni", "Owed"), width: 12, num: true, value: (j) => owedCell(owedOn(j)), color: (j) => owedColor(owedOn(j)) },
    { label: t("Siku", "Days"), width: 8, num: true, value: (j) => (owedOn(j) > 0 ? String(j.days) : "–"), color: (j) => (owedOn(j) > 0 ? ageColor(j.days) : undefined) },
  ];

  return (
    <Document title={r.clientName ? `${title} · ${r.clientName}` : title} author={COMPANY} creator={COMPANY} producer={COMPANY}>
      <Page size="A4" style={s.page}>
        <View style={[s.row, { justifyContent: "space-between", alignItems: "flex-start" }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.company}>{COMPANY}</Text>
            <Text style={s.title}>{title}</Text>
            {r.clientName && (
              <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 4 }}>
                {t("Mteja", "Client")}: {r.clientName}
              </Text>
            )}
            <Text style={[s.muted, { marginTop: 2 }]}>
              {r.scopeLabel} · {r.carsLabel}
            </Text>
          </View>
          <Text style={[s.muted, { fontSize: 8, textAlign: "right", width: 120 }]}>
            {t("Imetengenezwa", "Made")} {r.createdLabel}
          </Text>
        </View>

        {r.debtors.length === 0 ? (
          <View style={[s.box, { marginTop: 18, alignItems: "center", paddingVertical: 24 }]}>
            <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: C.in }}>
              {r.filters.withPaid ? t("Hakuna kazi", "No jobs") : t("Hakuna deni", "Nothing owed")}
            </Text>
            <Text style={[s.muted, { marginTop: 4 }]}>
              {r.filters.withPaid
                ? t("Hakuna kazi ya mteja katika ripoti hii.", "There is no client's job in this report.")
                : t("Kila mteja amelipa kazi zote katika ripoti hii.", "Every client has paid for every job in this report.")}
            </Text>
          </View>
        ) : (
          <>
            <View style={[s.row, { gap: 8, marginTop: 14 }]}>
              <Kpi
                label={t("Thamani ya kazi", "Value of the jobs")}
                value={r.amount}
                color={C.balance}
                soft={C.balanceSoft}
                note={`${r.debtors.length === 1 ? t("Mteja 1", "1 client") : t(`Wateja ${r.debtors.length}`, `${r.debtors.length} clients`)} · ${jobsLabel(r.jobs.length)}`}
              />
              <Kpi
                label={t("Amelipa", "Paid")}
                value={r.paid}
                color={C.in}
                soft={C.inSoft}
                note={r.amount ? t(`${Math.round((r.paid / r.amount) * 100)}% ya thamani`, `${Math.round((r.paid / r.amount) * 100)}% of the value`) : "0%"}
              />
              <Kpi
                label={t("Deni lililobaki", "Still owed")}
                value={r.total}
                color={r.over60 > 0 ? C.danger : r.total > 0 ? C.out : C.in}
                soft={r.over60 > 0 ? C.dangerSoft : r.total > 0 ? C.outSoft : C.inSoft}
                note={
                  r.over60 > 0
                    ? t(`${money(r.over60)} zaidi ya siku 60`, `${money(r.over60)} over 60 days`)
                    : r.total > 0
                      ? t("Hakuna la zaidi ya siku 60", "Nothing over 60 days")
                      : t("Amelipa kila kitu", "Everything paid")
                }
              />
            </View>

            {r.total > 0 && (
            <View style={s.section} wrap={false}>
              <Text style={s.h2}>{t("Umri wa madeni", "How old the debts are")}</Text>
              <View style={[s.row, { height: 10, borderRadius: 3, overflow: "hidden", backgroundColor: C.line }]}>
                {r.bands.map((b, i) => (b.owed > 0 ? <View key={b.label} style={{ flex: b.owed, backgroundColor: BAND_COLORS[i] }} /> : null))}
              </View>
              <View style={[s.row, { gap: 8, marginTop: 8 }]}>
                {r.bands.map((b, i) => (
                  <View key={b.label} style={[s.box, { flex: 1, padding: 8 }]}>
                    <View style={[s.row, { alignItems: "center", gap: 4 }]}>
                      <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: BAND_COLORS[i] }} />
                      <Text style={[s.muted, { fontSize: 8 }]}>{b.label}</Text>
                    </View>
                    <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 3 }}>{money(b.owed)}</Text>
                    <Text style={[s.muted, { fontSize: 7, marginTop: 1 }]}>{r.total ? `${Math.round((b.owed / r.total) * 100)}%` : "0%"}</Text>
                  </View>
                ))}
              </View>
            </View>
            )}

            {!r.clientName && (
            <View style={s.section}>
              <Text style={s.h2}>{t("Kila mteja", "Each client")}</Text>
              <Table
                columns={summary}
                rows={r.debtors}
                total={[
                  t("Jumla", "Total"),
                  String(r.jobs.length),
                  money(r.debtors.reduce((a, d) => a + d.amount, 0)),
                  money(r.debtors.reduce((a, d) => a + d.paid, 0)),
                  money(r.total),
                  "",
                ]}
              />
              <Text style={[s.muted, { fontSize: 7, marginTop: 4 }]}>
                {t("Siku: tangu kazi yake ya zamani zaidi ambayo bado haijalipwa.", "Days: since their oldest job that is still unpaid.")}
              </Text>
            </View>
            )}

            <View style={s.section}>
              <Text style={s.h2}>
                {r.filters.withPaid ? t("Kazi za kila mteja", "Each client's jobs") : t("Kazi ambazo bado hazijalipwa", "Jobs still unpaid")}
              </Text>
              {r.debtors.map((d) => (
                <View key={d.customer} style={{ marginBottom: 12 }}>
                  <View style={[s.row, { justifyContent: "space-between", marginBottom: 3 }]} wrap={false} minPresenceAhead={40}>
                    <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10 }}>{d.customer}</Text>
                    <Text style={{ fontFamily: "Helvetica-Bold", color: owedColor(d.owed) }}>
                      {d.owed > 0
                        ? `${t("Deni", "Owed")} ${money(d.owed)}`
                        : t(`Amelipa yote, ${money(d.paid)}`, `All paid, ${money(d.paid)}`)}
                    </Text>
                  </View>
                  <Table
                    columns={detail}
                    rows={d.jobs}
                    total={d.jobs.length > 1 ? [t("Jumla", "Total"), "", "", "", money(d.amount), money(d.paid), owedCell(d.owed), ""] : undefined}
                  />
                </View>
              ))}
            </View>
          </>
        )}

        <View style={s.footer} fixed>
          <Text>
            {COMPANY} · {title}
          </Text>
          <Text render={({ pageNumber, totalPages }) => t(`Ukurasa ${pageNumber} kati ya ${totalPages}`, `Page ${pageNumber} of ${totalPages}`)} />
        </View>
      </Page>
    </Document>
  );
}

export const buildDebtorsPdf = (r: DebtorReport) => renderToBuffer(<DebtorsPdf r={r} />);
