import "server-only";
import { Circle, Document, Page, Path, renderToBuffer, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { COMPANY } from "@/lib/company";
import { formatKm, formatLitres, formatMoney, formatRate, formatWallTime } from "@/lib/format";
import { expenseCar, incomeCar, type ReportData } from "@/lib/report-data";

// The PDF report: headline numbers and charts first, then the tables, then every entry.
// Built-in Helvetica only covers Western European characters, so the text avoids symbols like ⚠.

const C = {
  ink: "#14201d",
  muted: "#5f6673",
  line: "#e1e6e4",
  accent: "#0f7b6c",
  accentSoft: "#e2f3ef",
  in: "#1f7a45",
  inSoft: "#e3f4e9",
  out: "#b86e00",
  outBar: "#d08a1a",
  outSoft: "#fcf0d9",
  balance: "#2357b5",
  balanceSoft: "#e7eefb",
  danger: "#c22f2f",
  dangerSoft: "#fce8e8",
};
const PALETTE = ["#0f7b6c", "#d08a1a", "#2357b5", "#c22f2f", "#7a4fb5", "#1f7a45", "#8a6d3b", "#4a90a4", "#b5487a", "#5f6673"];

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 48, paddingHorizontal: 36, fontSize: 9, fontFamily: "Helvetica", color: C.ink },
  company: { fontSize: 15, fontFamily: "Helvetica-Bold", color: C.accent },
  title: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 2 },
  muted: { color: C.muted },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  section: { marginTop: 16 },
  row: { flexDirection: "row" },
  card: { flex: 1, borderRadius: 6, padding: 10, borderWidth: 1 },
  cardLabel: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  cardValue: { fontSize: 15, fontFamily: "Helvetica-Bold", marginTop: 3 },
  box: { borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 10 },
  th: { flexDirection: "row", backgroundColor: C.accentSoft, color: C.accent, fontFamily: "Helvetica-Bold", paddingVertical: 4 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.line, paddingVertical: 4 },
  total: { flexDirection: "row", borderTopWidth: 1, borderTopColor: C.ink, paddingVertical: 4, fontFamily: "Helvetica-Bold" },
  cell: { paddingHorizontal: 4 },
  num: { paddingHorizontal: 4, textAlign: "right" },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: C.muted },
});

type Column<T> = { label: string; width: number; num?: boolean; value: (row: T) => string; color?: (row: T) => string | undefined };

function Table<T>({ columns, rows, total }: { columns: Column<T>[]; rows: T[]; total?: string[] }) {
  return (
    <View>
      <View style={s.th} fixed>
        {columns.map((c) => (
          <Text key={c.label} style={[c.num ? s.num : s.cell, { width: `${c.width}%` }]}>
            {c.label}
          </Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={s.tr} wrap={false}>
          {columns.map((c) => (
            <Text key={c.label} style={[c.num ? s.num : s.cell, { width: `${c.width}%`, color: c.color?.(r) ?? C.ink }]}>
              {c.value(r)}
            </Text>
          ))}
        </View>
      ))}
      {total && (
        <View style={s.total} wrap={false}>
          {columns.map((c, i) => (
            <Text key={c.label} style={[c.num ? s.num : s.cell, { width: `${c.width}%` }]}>
              {total[i] ?? ""}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function Kpi({ label, value, color, soft, note }: { label: string; value: number; color: string; soft: string; note: string }) {
  return (
    <View style={[s.card, { backgroundColor: soft, borderColor: soft }]}>
      <Text style={[s.cardLabel, { color }]}>{label}</Text>
      <Text style={[s.cardValue, { color }]}>{formatMoney(value)}</Text>
      <Text style={[s.muted, { fontSize: 8, marginTop: 2 }]}>{note}</Text>
    </View>
  );
}

const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

// Side-by-side columns per period, drawn with boxes so no font or SVG text is needed.
function ColumnChart({ items, height = 130 }: { items: { label: string; income: number; spend: number }[]; height?: number }) {
  const max = Math.max(1, ...items.flatMap((i) => [i.income, i.spend]));
  return (
    <View>
      <View style={[s.row, { height, alignItems: "flex-end", borderBottomWidth: 1, borderBottomColor: C.line }]}>
        {items.map((i) => (
          <View key={i.label} style={{ flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: 2 }}>
            {[
              [i.income, C.in],
              [i.spend, C.outBar],
            ].map(([v, color], k) => (
              <View key={k} style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 6, color: C.muted, marginBottom: 1 }}>{(v as number) > 0 ? compact(v as number) : ""}</Text>
                <View style={{ width: 12, height: Math.max(((v as number) / max) * (height - 14), (v as number) > 0 ? 1 : 0), backgroundColor: color as string }} />
              </View>
            ))}
          </View>
        ))}
      </View>
      <View style={s.row}>
        {items.map((i) => (
          <Text key={i.label} style={{ flex: 1, textAlign: "center", fontSize: 7, color: C.muted, marginTop: 3 }}>
            {i.label.replace("Wiki ya ", "")}
          </Text>
        ))}
      </View>
      <View style={[s.row, { marginTop: 6, gap: 12, justifyContent: "center" }]}>
        <Legend color={C.in} label="Mapato" />
        <Legend color={C.outBar} label="Matumizi" />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={[s.row, { alignItems: "center", gap: 4 }]}>
      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
      <Text style={{ fontSize: 8 }}>{label}</Text>
    </View>
  );
}

// A pie (or a doughnut with a hole), with its legend beside it.
function Pie({ items, hole = false, size = 110 }: { items: { label: string; value: number; color: string }[]; hole?: boolean; size?: number }) {
  const total = items.reduce((a, b) => a + b.value, 0);
  const r = size / 2;
  // Each slice starts where the ones before it end, from twelve o'clock.
  const shown = items.filter((i) => i.value > 0);
  const slices = shown.map((i, k) => ({
    ...i,
    start: -Math.PI / 2 + (shown.slice(0, k).reduce((a, b) => a + b.value, 0) / total) * Math.PI * 2,
    sweep: (i.value / total) * Math.PI * 2,
  }));
  const point = (a: number) => `${r + r * Math.cos(a)} ${r + r * Math.sin(a)}`;
  return (
    <View style={[s.row, { alignItems: "center", gap: 12 }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {total === 0 && <Circle cx={r} cy={r} r={r} fill={C.line} />}
        {slices.map((sl) =>
          sl.sweep >= Math.PI * 2 - 1e-6 ? (
            <Circle key={sl.label} cx={r} cy={r} r={r} fill={sl.color} />
          ) : (
            <Path
              key={sl.label}
              d={`M ${r} ${r} L ${point(sl.start)} A ${r} ${r} 0 ${sl.sweep > Math.PI ? 1 : 0} 1 ${point(sl.start + sl.sweep)} Z`}
              fill={sl.color}
              stroke="#ffffff"
              strokeWidth={1}
            />
          ),
        )}
        {hole && <Circle cx={r} cy={r} r={r * 0.55} fill="#ffffff" />}
      </Svg>
      <View style={{ flex: 1, gap: 4 }}>
        {items.map((i) => (
          <View key={i.label} style={[s.row, { alignItems: "center", gap: 4 }]}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: i.color }} />
            <Text style={{ flex: 1, fontSize: 8 }}>{i.label}</Text>
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>
              {total ? Math.round((i.value / total) * 100) : 0}%
            </Text>
          </View>
        ))}
        {total === 0 && <Text style={[s.muted, { fontSize: 8 }]}>Hakuna matumizi</Text>}
      </View>
    </View>
  );
}

// Horizontal bars, one per row, with the value at the end.
function BarList({ items, format, color }: { items: { label: string; value: number }[]; format: (n: number) => string; color: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <View style={{ gap: 5 }}>
      {items.map((i) => (
        <View key={i.label} style={[s.row, { alignItems: "center", gap: 6 }]}>
          <Text style={{ width: 70, fontSize: 8 }}>{i.label}</Text>
          <View style={{ flex: 1, height: 9, backgroundColor: C.accentSoft, borderRadius: 2 }}>
            <View style={{ width: `${(i.value / max) * 100}%`, height: 9, backgroundColor: color, borderRadius: 2 }} />
          </View>
          <Text style={{ width: 44, fontSize: 8, textAlign: "right", fontFamily: "Helvetica-Bold" }}>{format(i.value)}</Text>
        </View>
      ))}
    </View>
  );
}

const money = (n: number) => formatMoney(n);
const negative = (n: number) => (n < 0 ? C.danger : undefined);

function ReportPdf({ data }: { data: ReportData }) {
  const { totals, fuel } = data;
  const footer = (
    <View style={s.footer} fixed>
      <Text>
        {COMPANY} · {data.rangeLabel}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `Ukurasa ${pageNumber} kati ya ${totalPages}`} />
    </View>
  );

  return (
    <Document title={`Ripoti ${data.rangeLabel}`} author={COMPANY} creator={COMPANY} producer={COMPANY}>
      <Page size="A4" style={s.page}>
        <View style={[s.row, { justifyContent: "space-between", alignItems: "flex-start" }]}>
          <View>
            <Text style={s.company}>{COMPANY}</Text>
            <Text style={s.title}>Ripoti ya mapato na matumizi</Text>
            <Text style={[s.muted, { marginTop: 2 }]}>
              {data.rangeLabel} · {data.carsLabel} · {data.groupLabel}
            </Text>
          </View>
          <Text style={[s.muted, { fontSize: 8, textAlign: "right", width: 120 }]}>Imetengenezwa {data.createdLabel}</Text>
        </View>

        <View style={[s.row, { gap: 8, marginTop: 14 }]}>
          <Kpi label="Mapato" value={totals.income} color={C.in} soft={C.inSoft} note={`Rekodi ${data.incomes.length}`} />
          <Kpi label="Matumizi" value={totals.spend} color={C.out} soft={C.outSoft} note={`Maombi ${data.expenses.length} yaliyolipwa`} />
          <Kpi
            label="Salio"
            value={totals.balance}
            color={totals.balance < 0 ? C.danger : C.balance}
            soft={totals.balance < 0 ? C.dangerSoft : C.balanceSoft}
            note={totals.balance < 0 ? "Matumizi yamezidi mapato" : "Mapato toa matumizi"}
          />
        </View>

        <View style={[s.section, s.box]}>
          <Text style={s.h2}>Mapato na matumizi kwa {data.periodName.toLowerCase()}</Text>
          <ColumnChart items={data.periods} />
        </View>

        <View style={[s.row, { gap: 8, marginTop: 10 }]}>
          <View style={[s.box, { flex: 1 }]}>
            <Text style={s.h2}>Matumizi kwa gari</Text>
            <Pie items={data.byCar.map((c, i) => ({ label: c.label, value: c.spend, color: PALETTE[i % PALETTE.length] }))} />
          </View>
          <View style={[s.box, { flex: 1 }]}>
            <Text style={s.h2}>Matumizi kwa aina</Text>
            <Pie
              hole
              items={data.byKind.map((k, i) => ({ label: k.label, value: k.total, color: [C.outBar, C.balance][i] }))}
            />
          </View>
        </View>

        <View style={[s.section]} wrap={false}>
          <Text style={s.h2}>Kila gari</Text>
          <Table
            columns={[
              { label: "Namba", width: 16, value: (c) => c.label },
              { label: "Gari", width: 22, value: (c) => c.car ?? "" },
              { label: "Mapato", width: 17, num: true, value: (c) => money(c.income), color: () => C.in },
              { label: "Matumizi", width: 17, num: true, value: (c) => money(c.spend) },
              { label: "Salio", width: 17, num: true, value: (c) => money(c.income - c.spend), color: (c) => negative(c.income - c.spend) },
              { label: "Maombi", width: 11, num: true, value: (c) => String(c.count) },
            ]}
            rows={data.byCar}
            total={["Jumla", "", money(totals.income), money(totals.spend), money(totals.balance), String(data.expenses.length)]}
          />
        </View>
        {footer}
      </Page>

      <Page size="A4" style={s.page}>
        <View wrap={false}>
          <Text style={s.h2}>Kwa {data.periodName.toLowerCase()}</Text>
          <Table
            columns={[
              { label: data.periodName, width: 34, value: (p) => p.label },
              { label: "Mapato", width: 22, num: true, value: (p) => money(p.income), color: () => C.in },
              { label: "Matumizi", width: 22, num: true, value: (p) => money(p.spend) },
              { label: "Salio", width: 22, num: true, value: (p) => money(p.income - p.spend), color: (p) => negative(p.income - p.spend) },
            ]}
            rows={data.periods}
            total={["Jumla", money(totals.income), money(totals.spend), money(totals.balance)]}
          />
        </View>

        <View style={s.section}>
          <Text style={s.h2}>Mafuta</Text>
          <Text style={[s.muted, { marginBottom: 6 }]}>
            Km {formatKm(fuel.all.km)} · lita {formatLitres(fuel.all.litres)} · wastani {formatRate(fuel.all.kmPerLitre)} km kwa lita
            {fuel.all.costPerKm !== null ? ` · ${money(fuel.all.costPerKm)} kwa km` : ""}
          </Text>
          <View style={[s.row, { gap: 8 }]}>
            <View style={{ flex: 3 }}>
              <Table
                columns={[
                  { label: "Gari", width: 17, value: (c) => c.plate },
                  { label: "Dereva", width: 27, value: (c) => c.driver ?? "Hana dereva" },
                  { label: "Km", width: 15, num: true, value: (c) => (c.totals.stretches ? formatKm(c.totals.km) : "-") },
                  { label: "Lita", width: 13, num: true, value: (c) => (c.totals.stretches ? formatLitres(c.totals.litres) : "-") },
                  { label: "Km/L", width: 12, num: true, value: (c) => formatRate(c.totals.kmPerLitre).replace("–", "-") },
                  { label: "TSh/km", width: 16, num: true, value: (c) => (c.totals.costPerKm === null ? "-" : money(c.totals.costPerKm)) },
                ]}
                rows={fuel.cars}
              />
            </View>
            <View style={[s.box, { flex: 2 }]}>
              <Text style={[s.h2, { fontSize: 9 }]}>Km kwa lita</Text>
              <BarList
                color={C.balance}
                format={(n) => formatRate(n)}
                items={fuel.cars.map((c) => ({ label: c.plate, value: c.totals.kmPerLitre ?? 0 }))}
              />
            </View>
          </View>
        </View>

        {fuel.drivers.length > 0 && (
          <View style={s.section} wrap={false}>
            <Text style={s.h2}>Mafuta kwa dereva</Text>
            <Table
              columns={[
                { label: "Dereva", width: 36, value: (d) => d.name },
                { label: "Km", width: 16, num: true, value: (d) => formatKm(d.totals.km) },
                { label: "Lita", width: 16, num: true, value: (d) => formatLitres(d.totals.litres) },
                { label: "Km/L", width: 14, num: true, value: (d) => formatRate(d.totals.kmPerLitre).replace("–", "-") },
                { label: "TSh kwa km", width: 18, num: true, value: (d) => (d.totals.costPerKm === null ? "-" : money(d.totals.costPerKm)) },
              ]}
              rows={fuel.drivers}
            />
          </View>
        )}

        {footer}
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={s.h2}>Matumizi yote ({data.expenses.length})</Text>
        <Table
          columns={[
            { label: "Imetolewa", width: 17, value: (e) => formatWallTime(e.issued_at) },
            { label: "Gari", width: 11, value: (e) => expenseCar(e) },
            { label: "Aina", width: 10, value: (e) => (e.kind === "fuel" ? "Mafuta" : "Mengineyo") },
            { label: "Aliyeomba", width: 15, value: (e) => e.requester },
            { label: "Sababu", width: 31, value: (e) => e.reason },
            { label: "Kiasi", width: 16, num: true, value: (e) => money(Number(e.amount)) },
          ]}
          rows={data.expenses}
          total={["Jumla", "", "", "", "", money(totals.spend)]}
        />

        <View style={s.section}>
          <Text style={s.h2}>Mapato yote ({data.incomes.length})</Text>
          <Table
            columns={[
              { label: "Imerekodiwa", width: 17, value: (i) => formatWallTime(i.recorded_at) },
              { label: "Gari", width: 13, value: (i) => incomeCar(i) },
              { label: "Maelezo", width: 38, value: (i) => i.description ?? (i.car_id !== null ? "" : i.source) },
              { label: "Na", width: 16, value: (i) => i.recorded_by ?? "" },
              { label: "Kiasi", width: 16, num: true, value: (i) => money(Number(i.amount)), color: () => C.in },
            ]}
            rows={data.incomes}
            total={["Jumla", "", "", "", money(totals.income)]}
          />
        </View>
        {footer}
      </Page>
    </Document>
  );
}

export const buildPdf = (data: ReportData) => renderToBuffer(<ReportPdf data={data} />);
