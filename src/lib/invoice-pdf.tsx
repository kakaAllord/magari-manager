import "server-only";
import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { amountInEnglish } from "@/lib/amount-words-en";
import { COMPANY, companyDetails } from "@/lib/company";
import { formatDate, formatMoney, formatQuantity, formatUnitPrice, formatWallDate } from "@/lib/format";
import { sw, type Tr } from "@/lib/i18n";
import { bankRows, type InvoiceDetail } from "@/lib/invoices";

// The invoice as a one-page PDF for the customer. Built-in Helvetica only covers Western
// European characters, so an arrow typed in a route prints as a dash.

const C = { ink: "#14201d", muted: "#5f6673", line: "#e1e6e4", accent: "#1d4ed8", accentSoft: "#e8eefc", ok: "#1f7a45", danger: "#c22f2f" };

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: C.ink },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  company: { fontSize: 18, fontFamily: "Helvetica-Bold", color: C.accent },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", textAlign: "right" },
  meta: { textAlign: "right", color: C.muted, marginTop: 2 },
  label: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.muted, marginBottom: 3 },
  box: { marginTop: 24, borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 10 },
  bold: { fontFamily: "Helvetica-Bold" },
  table: { marginTop: 20 },
  th: { flexDirection: "row", backgroundColor: C.accentSoft, color: C.accent, fontFamily: "Helvetica-Bold", paddingVertical: 5 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.line, paddingVertical: 6 },
  cell: { paddingHorizontal: 5 },
  num: { paddingHorizontal: 5, textAlign: "right" },
  total: { flexDirection: "row", marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.ink },
  stamp: { marginTop: 16, alignSelf: "flex-start", borderWidth: 1.5, borderRadius: 4, paddingVertical: 4, paddingHorizontal: 10, fontFamily: "Helvetica-Bold", fontSize: 12 },
  words: { marginTop: 8, color: C.ink },
  bankRow: { flexDirection: "row", marginTop: 2 },
  bankKey: { width: 110, color: C.muted },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: C.muted },
});

const pdfText = (text: string) => text.replaceAll("→", "-");

// The invoice is in the language of whoever downloads it. Lines all priced the same way are headed
// "Tani" / "Bei kwa tani" (or kilo, or "Idadi" / "Bei kwa kimoja" for mengineyo); an invoice mixing
// them heads them "Kiasi" / "Bei" and says the unit on each trip. With any mengineyo line, the
// description column is "Maelezo" rather than "Safari".
function tableColumns(lines: InvoiceDetail["lines"], t: Tr) {
  const units = new Set(lines.map((l) => l.unit));
  const only = units.size === 1 ? [...units][0] : null;
  const quantity =
    only === "kg" ? t("Kilo", "Kilos") : only === "other" ? t("Idadi", "Qty") : only ? t("Tani", "Tonnes") : units.has("other") ? t("Idadi", "Qty") : t("Uzito", "Weight");
  const price =
    only === "kg" ? t("Bei kwa kilo", "Price per kilo") : only === "other" ? t("Bei kwa kimoja", "Price each") : only ? t("Bei kwa tani", "Price per tonne") : t("Bei", "Price");
  const columns = [
    { label: t("Na.", "No."), width: 6, num: false },
    { label: units.has("other") ? t("Maelezo", "Description") : t("Safari", "Trip"), width: 36, num: false },
    { label: t("Gari", "Vehicle"), width: 12, num: false },
    { label: quantity, width: 12, num: true },
    { label: price, width: 16, num: true },
    { label: t("Kiasi", "Amount"), width: 18, num: true },
  ];
  return { columns, mixed: !only };
}

// The unit after a figure on a mixed invoice: " kg", " t", or nothing for mengineyo.
const unitMark = (unit: string) => (unit === "kg" ? " kg" : unit === "other" ? "" : " t");
const perUnit = (unit: string) => (unit === "kg" ? "/kg" : unit === "other" ? "" : "/t");

function InvoicePdf({ invoice: inv, t }: { invoice: InvoiceDetail; t: Tr }) {
  const { columns, mixed } = tableColumns(inv.lines, t);
  return (
    <Document title={`${inv.number} ${COMPANY}`} author={COMPANY}>
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          <View>
            <Text style={s.company}>{COMPANY}</Text>
            {companyDetails(t).map((line) => (
              <Text key={line} style={{ color: C.muted, marginTop: 2 }}>
                {line}
              </Text>
            ))}
          </View>
          <View>
            <Text style={s.title}>INVOICE</Text>
            <Text style={[s.meta, s.bold, { color: C.ink }]}>{inv.number}</Text>
            <Text style={s.meta}>
              {t("Tarehe", "Date")}: {formatWallDate(inv.issued_on)}
            </Text>
            {inv.due_on && (
              <Text style={s.meta}>
                {t("Mwisho wa kulipa", "Due")}: {formatWallDate(inv.due_on)}
              </Text>
            )}
          </View>
        </View>

        <View style={s.box}>
          <Text style={s.label}>{t("KWA", "BILL TO")}</Text>
          <Text style={[s.bold, { fontSize: 12 }]}>{pdfText(inv.customer_name)}</Text>
          {inv.customer_contact && <Text style={{ marginTop: 3, color: C.muted }}>{pdfText(inv.customer_contact)}</Text>}
        </View>

        <View style={s.table}>
          <View style={s.th}>
            {columns.map((c) => (
              <Text key={c.label} style={[c.num ? s.num : s.cell, { width: `${c.width}%` }]}>
                {c.label}
              </Text>
            ))}
          </View>
          {inv.lines.map((l) => (
            <View key={l.position} style={s.tr} wrap={false}>
              {[
                String(l.position),
                pdfText(l.description),
                l.plate ?? "",
                mixed ? `${formatQuantity(l)}${unitMark(l.unit)}` : formatQuantity(l),
                mixed ? `${formatUnitPrice(l)}${perUnit(l.unit)}` : formatUnitPrice(l),
                formatMoney(l.amount),
              ].map((value, i) => (
                <Text key={i} style={[columns[i].num ? s.num : s.cell, { width: `${columns[i].width}%` }]}>
                  {value}
                </Text>
              ))}
            </View>
          ))}
          {/* Lined up with the amount column. */}
          <View style={s.total}>
            <Text style={[s.num, s.bold, { fontSize: 12, width: "82%" }]}>{t("Jumla", "Total")}</Text>
            <Text style={[s.num, s.bold, { fontSize: 12, width: "18%" }]}>{formatMoney(inv.total)}</Text>
          </View>
          <Text style={s.words}>
            <Text style={s.label}>{t("KIASI KWA MANENO", "AMOUNT IN WORDS")}: </Text>
            {amountInEnglish(inv.total)}
          </Text>
        </View>

        {inv.bank_name && (
          <View style={s.box} wrap={false}>
            <Text style={s.label}>{t("TAARIFA ZA BENKI", "BANK DETAILS")}</Text>
            {bankRows(inv, t).map(([key, value]) => (
              <View key={key} style={s.bankRow}>
                <Text style={s.bankKey}>{key}</Text>
                <Text style={[s.bold, { flex: 1 }]}>{pdfText(value)}</Text>
              </View>
            ))}
          </View>
        )}

        {inv.payment_details && (
          <View style={s.box}>
            <Text style={s.label}>{t("MAELEZO YA MALIPO", "PAYMENT DETAILS")}</Text>
            <Text>{pdfText(inv.payment_details)}</Text>
          </View>
        )}

        {inv.status === "paid" && inv.paid_at && (
          <Text style={[s.stamp, { color: C.ok, borderColor: C.ok }]}>
            {t("IMELIPWA", "PAID")} {formatDate(inv.paid_at).toUpperCase()}
          </Text>
        )}
        {inv.status === "cancelled" && <Text style={[s.stamp, { color: C.danger, borderColor: C.danger }]}>{t("IMEFUTWA", "CANCELLED")}</Text>}

        <View style={s.footer} fixed>
          <Text>{COMPANY}</Text>
          <Text>{inv.number}</Text>
        </View>
      </Page>
    </Document>
  );
}

export const buildInvoicePdf = (invoice: InvoiceDetail, t: Tr = sw) => renderToBuffer(<InvoicePdf invoice={invoice} t={t} />);
