import "server-only";
import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { amountInEnglish } from "@/lib/amount-words-en";
import { COMPANY, COMPANY_DETAILS } from "@/lib/company";
import { formatDate, formatLitres } from "@/lib/format";
import type { MoneyRequest } from "@/lib/requests";
import { paymentMethod, SUPPORTING_DOCUMENTS } from "@/lib/voucher-fields";

// The payment voucher of one payment, one A4 page, laid out like the company's own template
// (A. details, B. particulars, C. expenditure, D. documents, E. review and authorisation) but
// filled in from the app: who asked, who checked, approved and paid it, with a line for each to
// sign. It has no recipient section: the review rows already name who got the money and why.
// Printed in English like the template. Built-in Helvetica only covers Western European
// characters, so an arrow typed in a reason prints as a dash.

const C = { ink: "#111827", muted: "#6b7280", line: "#e5e7eb", accent: "#1d4ed8", accentSoft: "#eef3fd" };

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 56, paddingHorizontal: 40, fontSize: 9.5, fontFamily: "Helvetica", color: C.ink },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: C.accent },
  company: { fontSize: 15, fontFamily: "Helvetica-Bold", color: C.accent },
  small: { color: C.muted, marginTop: 2, fontSize: 8.5 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", textAlign: "right", letterSpacing: 1 },
  meta: { textAlign: "right", marginTop: 3 },
  section: { marginTop: 16 },
  heading: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.accent, letterSpacing: 0.8, marginBottom: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  field: { width: "50%", paddingVertical: 4, paddingRight: 12, borderBottomWidth: 0.5, borderBottomColor: C.line },
  key: { fontSize: 7.5, color: C.muted, marginBottom: 1.5 },
  bold: { fontFamily: "Helvetica-Bold" },
  panel: { backgroundColor: C.accentSoft, borderRadius: 4, padding: 10, flexDirection: "row", gap: 16 },
  th: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.ink, paddingBottom: 4, fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.muted },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.line, paddingVertical: 5 },
  cell: { paddingRight: 6 },
  num: { textAlign: "right", paddingLeft: 6 },
  docs: { flexDirection: "row", flexWrap: "wrap" },
  doc: { width: "25%", flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 2.5 },
  box: { width: 8, height: 8, borderWidth: 0.75, borderColor: C.muted, borderRadius: 1.5 },
  ticked: { backgroundColor: C.accent, borderColor: C.accent },
  footer: { position: "absolute", bottom: 22, left: 40, right: 40, fontSize: 7, color: C.muted },
});

const pdfText = (t: string) => t.replaceAll("→", "-");
const figure = (n: string | number) => Number(n).toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const when = (d: Date | null) => (d ? formatDate(d) : "");

// The detailed expenditure: the breakdown given with the request; fuel as litres at the price per
// litre; anything else as one line of its reason.
function lines(r: MoneyRequest) {
  if (r.items.length) return r.items.map((i) => ({ text: i.description, qty: figure(i.quantity), price: figure(i.unit_price), amount: i.amount }));
  if (r.kind === "fuel" && r.fuel_price) {
    const litres = Number(r.amount) / r.fuel_price;
    return [{ text: `Fuel (litres)${r.reason !== "Mafuta" ? ` - ${r.reason}` : ""}`, qty: formatLitres(litres), price: figure(r.fuel_price), amount: r.amount }];
  }
  return [{ text: r.reason, qty: "1", price: figure(r.amount), amount: r.amount }];
}

// Review and authorisation as the request went through the app. A logistics manager's own request
// checked itself; approvals from before the factory manager's step name nobody; history typed in
// later was paid outside the app, so only who typed it in is known.
function reviewRows(r: MoneyRequest) {
  const own = r.requester_role === "manager";
  const role = own ? "Logistics manager" : "Driver";
  if (r.backfilled_at) {
    return [
      { label: "Prepared by", name: r.reviewer_name ?? "", role: "Logistics manager (typed in as history)", at: when(r.backfilled_at) },
      { label: "Checked / verified by", name: "", role: "", at: "" },
      { label: "Approved by", name: "", role: "", at: "" },
      { label: "Paid", name: "Before it was recorded in the app", role: "", at: when(r.issued_at) },
    ];
  }
  return [
    { label: "Requested by", name: r.requester_name, role, at: when(r.created_at) },
    { label: "Checked / verified by", name: own ? r.requester_name : (r.reviewer_name ?? ""), role: "Logistics manager", at: when(r.reviewed_at) },
    { label: "Approved by", name: r.factory_reviewer_name ?? "", role: "Factory manager", at: when(r.factory_reviewed_at) },
    { label: "Paid by", name: r.issuer_name ?? "", role: "Accountant", at: when(r.issued_at) },
  ];
}

const COLS = { no: "6%", text: "50%", qty: "11%", price: "16%", amount: "17%" };
const REVIEW = { label: "24%", name: "34%", at: "14%", sign: "28%" };

function VoucherPage({ request: r }: { request: MoneyRequest }) {
  const number = r.voucher_number ?? "";
  const method = paymentMethod(r.payment_method)?.en;
  const plate = r.car?.split(" · ").at(-1) ?? null;
  const items = lines(r);
  const fields: [string, string][] = [
    ["Voucher no.", number],
    ["Date", when(r.issued_at)],
    ["Vehicle reg. no.", plate ?? "No vehicle"],
    ["Payment method", method ?? "-"],
    ["Reference no.", r.issue_note ? pdfText(r.issue_note) : "-"],
    ["Paid to", `${pdfText(r.requester_name)} (${r.requester_role === "manager" ? "Logistics manager" : "Driver"})`],
    ["Requested on", when(r.created_at)],
  ];

  return (
    <Page size="A4" style={s.page}>
      <View style={s.head}>
        <View>
          <Text style={s.company}>{COMPANY}</Text>
          {COMPANY_DETAILS.map((line) => (
            <Text key={line} style={s.small}>
              {line}
            </Text>
          ))}
        </View>
        <View>
          <Text style={s.title}>PAYMENT VOUCHER</Text>
          <Text style={[s.meta, s.bold]}>No. {number}</Text>
          <Text style={[s.meta, { color: C.muted }]}>{when(r.issued_at)}</Text>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.heading}>A. VOUCHER AND PAYMENT DETAILS</Text>
        <View style={s.grid}>
          {fields.map(([key, value]) => (
            <View key={key} style={s.field}>
              <Text style={s.key}>{key}</Text>
              <Text>{value}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.heading}>B. PAYMENT PARTICULARS</Text>
        <View style={s.panel}>
          <View style={{ flex: 1 }}>
            <Text style={s.key}>Payment purpose / description</Text>
            <Text>{pdfText(r.reason)}</Text>
            <Text style={[s.key, { marginTop: 8 }]}>Amount in words</Text>
            <Text>{amountInEnglish(r.amount)}</Text>
          </View>
          <View style={{ width: 130, alignItems: "flex-end" }}>
            <Text style={s.key}>Amount (TZS)</Text>
            <Text style={[s.bold, { fontSize: 16, color: C.accent }]}>{figure(r.amount)}</Text>
          </View>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.heading}>C. DETAILED EXPENDITURE</Text>
        <View style={s.th}>
          <Text style={[s.cell, { width: COLS.no }]}>No.</Text>
          <Text style={[s.cell, { width: COLS.text }]}>Description / particulars</Text>
          <Text style={[s.num, { width: COLS.qty }]}>Qty</Text>
          <Text style={[s.num, { width: COLS.price }]}>Unit price</Text>
          <Text style={[s.num, { width: COLS.amount }]}>Amount</Text>
        </View>
        {items.map((l, i) => (
          <View key={i} style={s.tr} wrap={false}>
            <Text style={[s.cell, { width: COLS.no, color: C.muted }]}>{i + 1}</Text>
            <Text style={[s.cell, { width: COLS.text }]}>{pdfText(l.text)}</Text>
            <Text style={[s.num, { width: COLS.qty }]}>{l.qty}</Text>
            <Text style={[s.num, { width: COLS.price }]}>{l.price}</Text>
            <Text style={[s.num, { width: COLS.amount }]}>{figure(l.amount)}</Text>
          </View>
        ))}
        <View style={[s.tr, { borderBottomWidth: 0 }]}>
          <Text style={[s.cell, s.bold, { width: "83%", textAlign: "right" }]}>TOTAL (TZS)</Text>
          <Text style={[s.num, s.bold, { width: COLS.amount }]}>{figure(r.amount)}</Text>
        </View>
      </View>

      <View style={s.section} wrap={false}>
        <Text style={s.heading}>D. SUPPORTING DOCUMENTS ATTACHED</Text>
        <View style={s.docs}>
          {SUPPORTING_DOCUMENTS.map((d) => {
            const on = r.supporting_documents.includes(d.key);
            return (
              <View key={d.key} style={s.doc}>
                <View style={on ? [s.box, s.ticked] : s.box} />
                <Text style={{ color: on ? C.ink : C.muted }}>
                  {d.en}
                  {d.key === "other" && on && r.supporting_other ? `: ${pdfText(r.supporting_other)}` : ""}
                </Text>
              </View>
            );
          })}
        </View>
        {r.receipt === "added" && (
          <Text style={[s.small, { marginTop: 4 }]}>
            Receipt photo kept in the app{r.receipt_note ? `, no. ${pdfText(r.receipt_note)}` : ""}.
          </Text>
        )}
      </View>

      <View style={s.section} wrap={false}>
        <Text style={s.heading}>E. REVIEW AND AUTHORISATION</Text>
        <View style={s.th}>
          <Text style={[s.cell, { width: REVIEW.label }]}>Responsibility</Text>
          <Text style={[s.cell, { width: REVIEW.name }]}>Name</Text>
          <Text style={[s.cell, { width: REVIEW.at }]}>Date</Text>
          <Text style={[s.cell, { width: REVIEW.sign }]}>Signature</Text>
        </View>
        {reviewRows(r).map((row) => (
          <View key={row.label} style={[s.tr, { paddingVertical: 8, alignItems: "flex-end" }]}>
            <Text style={[s.cell, s.bold, { width: REVIEW.label }]}>{row.label}</Text>
            <View style={[s.cell, { width: REVIEW.name }]}>
              <Text>{row.name ? pdfText(row.name) : "-"}</Text>
              {row.role !== "" && <Text style={{ fontSize: 7.5, color: C.muted, marginTop: 1 }}>{row.role}</Text>}
            </View>
            <Text style={[s.cell, { width: REVIEW.at }]}>{row.at || "-"}</Text>
            <View style={{ width: REVIEW.sign, borderBottomWidth: 0.5, borderBottomColor: C.muted, height: 14 }} />
          </View>
        ))}
      </View>

      <View style={s.footer} fixed>
        <Text>
          <Text style={[s.bold, { color: C.ink }]}>Control notice: </Text>
          No payment should be processed without a completed voucher, supporting evidence and approval by an authorised officer.
          Attach original supporting documents and file the voucher by its number.
        </Text>
        <Text style={{ marginTop: 6, textAlign: "center" }}>
          {COMPANY} | Payment voucher {number}
        </Text>
      </View>
    </Page>
  );
}

export const buildVoucherPdf = (request: MoneyRequest) =>
  renderToBuffer(
    <Document title={`${request.voucher_number} ${COMPANY}`} author={COMPANY}>
      <VoucherPage request={request} />
    </Document>,
  );

// Many vouchers in one file, one page each, to print or file a period at once.
export const buildVouchersPdf = (requests: MoneyRequest[], title: string) =>
  renderToBuffer(
    <Document title={`${title} ${COMPANY}`} author={COMPANY}>
      {requests.map((r) => (
        <VoucherPage key={r.id} request={r} />
      ))}
    </Document>,
  );
