import "server-only";
import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { COMPANY, COMPANY_DETAILS } from "@/lib/company";
import { formatDate, formatMoney, formatTonnes, formatWallDate } from "@/lib/format";
import type { InvoiceDetail } from "@/lib/invoices";

// The invoice (ankara) as a one-page PDF for the customer. Built-in Helvetica only covers Western
// European characters, so an arrow typed in a route prints as a dash.

const C = { ink: "#14201d", muted: "#5f6673", line: "#e1e6e4", accent: "#0f7b6c", accentSoft: "#e2f3ef", ok: "#1f7a45", danger: "#c22f2f" };

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
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: C.muted },
});

const pdfText = (t: string) => t.replaceAll("→", "-");

const columns = [
  { label: "Na.", width: 6, num: false },
  { label: "Safari", width: 38, num: false },
  { label: "Gari", width: 12, num: false },
  { label: "Tani", width: 10, num: true },
  { label: "Bei kwa tani", width: 16, num: true },
  { label: "Kiasi", width: 18, num: true },
] as const;

function InvoicePdf({ invoice: inv }: { invoice: InvoiceDetail }) {
  return (
    <Document title={`${inv.number} ${COMPANY}`} author={COMPANY}>
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          <View>
            <Text style={s.company}>{COMPANY}</Text>
            {COMPANY_DETAILS.map((line) => (
              <Text key={line} style={{ color: C.muted, marginTop: 2 }}>
                {line}
              </Text>
            ))}
          </View>
          <View>
            <Text style={s.title}>ANKARA</Text>
            <Text style={[s.meta, s.bold, { color: C.ink }]}>{inv.number}</Text>
            <Text style={s.meta}>Tarehe: {formatWallDate(inv.issued_on)}</Text>
            {inv.due_on && <Text style={s.meta}>Mwisho wa kulipa: {formatWallDate(inv.due_on)}</Text>}
          </View>
        </View>

        <View style={s.box}>
          <Text style={s.label}>KWA</Text>
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
                formatTonnes(l.tonnes),
                formatMoney(l.rate_per_tonne),
                formatMoney(l.amount),
              ].map((value, i) => (
                <Text key={i} style={[columns[i].num ? s.num : s.cell, { width: `${columns[i].width}%` }]}>
                  {value}
                </Text>
              ))}
            </View>
          ))}
          {/* Lined up with the Kiasi column. */}
          <View style={s.total}>
            <Text style={[s.num, s.bold, { fontSize: 12, width: "82%" }]}>Jumla</Text>
            <Text style={[s.num, s.bold, { fontSize: 12, width: "18%" }]}>{formatMoney(inv.total)}</Text>
          </View>
        </View>

        {inv.payment_details && (
          <View style={s.box}>
            <Text style={s.label}>MAELEZO YA MALIPO</Text>
            <Text>{pdfText(inv.payment_details)}</Text>
          </View>
        )}

        {inv.status === "paid" && inv.paid_at && (
          <Text style={[s.stamp, { color: C.ok, borderColor: C.ok }]}>IMELIPWA {formatDate(inv.paid_at).toUpperCase()}</Text>
        )}
        {inv.status === "cancelled" && <Text style={[s.stamp, { color: C.danger, borderColor: C.danger }]}>IMEFUTWA</Text>}

        <View style={s.footer} fixed>
          <Text>{COMPANY}</Text>
          <Text>{inv.number}</Text>
        </View>
      </Page>
    </Document>
  );
}

export const buildInvoicePdf = (invoice: InvoiceDetail) => renderToBuffer(<InvoicePdf invoice={invoice} />);
