import "server-only";
import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { shillingsInWords } from "@/lib/amount-words";
import { COMPANY, COMPANY_DETAILS } from "@/lib/company";
import { formatDate, formatDateTime, formatKm, formatLitres, formatMoney } from "@/lib/format";
import { gaugeLabel } from "@/lib/fuel-calc";
import type { MoneyRequest } from "@/lib/requests";

// The payment voucher (hati ya malipo) of one payment, printed on one page: what was paid, to whom
// and why, who approved, authorised and paid it in the app, and lines for wet signatures, the last
// one for whoever received the money. Built-in Helvetica only covers Western European characters,
// so an arrow typed in a reason prints as a dash.

const C = { ink: "#14201d", muted: "#5f6673", line: "#e1e6e4", accent: "#0f7b6c", accentSoft: "#e2f3ef" };

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: C.ink },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  company: { fontSize: 18, fontFamily: "Helvetica-Bold", color: C.accent },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", textAlign: "right" },
  meta: { textAlign: "right", color: C.muted, marginTop: 2 },
  label: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.muted, marginBottom: 3 },
  box: { marginTop: 18, borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 10 },
  bold: { fontFamily: "Helvetica-Bold" },
  th: { flexDirection: "row", marginTop: 18, backgroundColor: C.accentSoft, color: C.accent, fontFamily: "Helvetica-Bold", paddingVertical: 5 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.line, paddingVertical: 6 },
  cell: { paddingHorizontal: 5 },
  num: { paddingHorizontal: 5, textAlign: "right" },
  total: { flexDirection: "row", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.ink },
  steps: { flexDirection: "row", marginTop: 18, gap: 8 },
  step: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 8 },
  sign: { marginTop: 22, borderTopWidth: 0.75, borderTopColor: C.muted, paddingTop: 2, fontSize: 8, color: C.muted },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: C.muted },
});

const pdfText = (t: string) => t.replaceAll("→", "-");

// Each step as the request went through the app. Approvals from before the factory manager's step
// count as authorised and name nobody; a vehicle manager's own request approved itself.
function steps(r: MoneyRequest) {
  const own = r.requester_role === "manager";
  return [
    { label: "IMEOMBWA NA", name: r.requester_name, role: own ? "Meneja wa magari" : "Dereva", at: r.created_at },
    { label: "IMEKUBALIWA NA", name: own ? r.requester_name : (r.reviewer_name ?? "—"), role: "Meneja wa magari", at: r.reviewed_at },
    { label: "IMEIDHINISHWA NA", name: r.factory_reviewer_name ?? "—", role: "Meneja wa kiwanda", at: r.factory_reviewed_at },
    { label: "IMELIPWA NA", name: r.issuer_name ?? "—", role: "Mhasibu", at: r.issued_at },
  ];
}

function fuelLine(r: MoneyRequest) {
  return [
    r.fuel_price !== null && `Lita ${formatLitres(Number(r.amount) / r.fuel_price)} × ${formatMoney(r.fuel_price)}`,
    r.odometer_km !== null && `km ${formatKm(r.odometer_km)}`,
    r.gauge_eighths !== null && gaugeLabel(r.gauge_eighths),
  ]
    .filter(Boolean)
    .join(" · ");
}

function VoucherPdf({ request: r }: { request: MoneyRequest }) {
  const number = r.voucher_number ?? "";
  const fuel = fuelLine(r);
  return (
    <Document title={`${number} ${COMPANY}`} author={COMPANY}>
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
            <Text style={s.title}>HATI YA MALIPO</Text>
            <Text style={[s.meta, s.bold, { color: C.ink }]}>{number}</Text>
            {r.issued_at && <Text style={s.meta}>Tarehe: {formatDate(r.issued_at)}</Text>}
          </View>
        </View>

        <View style={s.box}>
          <Text style={s.label}>MLIPWAJI</Text>
          <Text style={[s.bold, { fontSize: 12 }]}>{pdfText(r.requester_name)}</Text>
          <Text style={{ marginTop: 3, color: C.muted }}>
            {r.requester_role === "manager" ? "Meneja wa magari" : "Dereva"} · Gari: {r.car ?? "Hakuna gari"}
          </Text>
        </View>

        <View style={s.th}>
          <Text style={[s.cell, { width: "75%" }]}>Maelezo</Text>
          <Text style={[s.num, { width: "25%" }]}>Kiasi</Text>
        </View>
        <View style={s.tr}>
          <View style={[s.cell, { width: "75%" }]}>
            <Text>
              {r.kind === "fuel" && r.reason !== "Mafuta" ? "Mafuta: " : ""}
              {pdfText(r.reason)}
            </Text>
            {fuel !== "" && <Text style={{ marginTop: 2, color: C.muted }}>{fuel}</Text>}
          </View>
          <Text style={[s.num, { width: "25%" }]}>{formatMoney(r.amount)}</Text>
        </View>
        <View style={s.total}>
          <Text style={[s.num, s.bold, { fontSize: 12, width: "75%" }]}>Jumla</Text>
          <Text style={[s.num, s.bold, { fontSize: 12, width: "25%" }]}>{formatMoney(r.amount)}</Text>
        </View>
        <Text style={{ marginTop: 6, paddingHorizontal: 5 }}>
          <Text style={s.bold}>Kwa maneno: </Text>
          {shillingsInWords(r.amount)}
        </Text>

        {(r.issue_note || r.receipt) && (
          <View style={s.box}>
            {r.issue_note && (
              <Text>
                <Text style={s.bold}>Kumbukumbu ya malipo: </Text>
                {pdfText(r.issue_note)}
              </Text>
            )}
            {r.receipt && (
              <Text style={{ marginTop: r.issue_note ? 3 : 0 }}>
                <Text style={s.bold}>Risiti: </Text>
                {r.receipt === "added" ? `imewekwa${r.receipt_note ? `, Na. ${pdfText(r.receipt_note)}` : ""}` : "bado haijawekwa"}
              </Text>
            )}
          </View>
        )}

        <View style={s.steps} wrap={false}>
          {steps(r).map((step) => (
            <View key={step.label} style={s.step}>
              <Text style={s.label}>{step.label}</Text>
              <Text style={s.bold}>{pdfText(step.name)}</Text>
              <Text style={{ color: C.muted, fontSize: 8, marginTop: 1 }}>{step.role}</Text>
              <Text style={{ color: C.muted, fontSize: 8, marginTop: 1 }}>{step.at ? formatDateTime(step.at) : " "}</Text>
              <Text style={s.sign}>Sahihi</Text>
            </View>
          ))}
        </View>

        <View style={[s.box, { marginTop: 18 }]} wrap={false}>
          <Text style={s.label}>IMEPOKELEWA NA</Text>
          <Text>
            Nimepokea {formatMoney(r.amount)} ({shillingsInWords(r.amount).toLowerCase()}).
          </Text>
          <View style={{ flexDirection: "row", gap: 16 }}>
            <Text style={[s.sign, { flex: 2 }]}>Jina: {pdfText(r.requester_name)}</Text>
            <Text style={[s.sign, { flex: 2 }]}>Sahihi</Text>
            <Text style={[s.sign, { flex: 1 }]}>Tarehe</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>{COMPANY}</Text>
          <Text>{number}</Text>
        </View>
      </Page>
    </Document>
  );
}

export const buildVoucherPdf = (request: MoneyRequest) => renderToBuffer(<VoucherPdf request={request} />);
