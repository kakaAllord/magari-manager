import "server-only";
import JSZip from "jszip";

// ExcelJS writes cells, tables and formatting but not charts, so native Excel charts are added to
// its output here: a chart part per chart, a drawing per sheet that places them, and the links
// between them. Each series points at real cell ranges, so a chart follows the workbook's
// formulas; the cached values make it show correctly before anything recalculates.

export type ChartSeries = {
  name: string;
  categoriesRef: string; // e.g. 'Muhtasari'!$A$12:$A$14
  valuesRef: string;
  categories: string[];
  values: number[];
  color?: string; // hex without #, for bar and column series
};

export type ChartSpec = {
  sheet: string;
  // Zero-based columns and rows of the top-left and bottom-right cells the chart covers.
  from: [col: number, row: number];
  to: [col: number, row: number];
  type: "pie" | "doughnut" | "column" | "bar";
  title: string;
  series: ChartSeries[];
  pointColors?: string[]; // slice colours for pie and doughnut
  numberFormat?: string;
};

const NS = {
  c: "http://schemas.openxmlformats.org/drawingml/2006/chart",
  a: "http://schemas.openxmlformats.org/drawingml/2006/main",
  r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  xdr: "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
  rel: "http://schemas.openxmlformats.org/package/2006/relationships",
};
const REL_DRAWING = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing";
const REL_CHART = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart";
const CT_DRAWING = "application/vnd.openxmlformats-officedocument.drawing+xml";
const CT_CHART = "application/vnd.openxmlformats-officedocument.drawingml.chart+xml";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const solid = (hex: string) => `<a:solidFill><a:srgbClr val="${hex}"/></a:solidFill>`;
const text = (size: number, bold = false, color = "3B4744") =>
  `<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${size}" b="${bold ? 1 : 0}">${solid(color)}</a:defRPr></a:pPr><a:endParaRPr lang="en-US"/></a:p></c:txPr>`;

function strRef(ref: string, items: string[]) {
  const pts = items.map((v, i) => `<c:pt idx="${i}"><c:v>${esc(v)}</c:v></c:pt>`).join("");
  return `<c:strRef><c:f>${esc(ref)}</c:f><c:strCache><c:ptCount val="${items.length}"/>${pts}</c:strCache></c:strRef>`;
}

function numRef(ref: string, items: number[], format: string) {
  const pts = items.map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join("");
  return `<c:numRef><c:f>${esc(ref)}</c:f><c:numCache><c:formatCode>${esc(format)}</c:formatCode><c:ptCount val="${items.length}"/>${pts}</c:numCache></c:numRef>`;
}

function chartXml(spec: ChartSpec) {
  const format = spec.numberFormat ?? "#,##0";
  const title = `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1200" b="1"/></a:pPr><a:r><a:rPr lang="en-US" sz="1200" b="1">${solid("14201D")}</a:rPr><a:t>${esc(spec.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>`;
  let plot: string;

  if (spec.type === "pie" || spec.type === "doughnut") {
    const s = spec.series[0];
    const points = (spec.pointColors ?? [])
      .slice(0, s.values.length)
      .map((color, i) => `<c:dPt><c:idx val="${i}"/><c:bubble3D val="0"/><c:spPr>${solid(color)}<a:ln w="12700">${solid("FFFFFF")}</a:ln></c:spPr></c:dPt>`)
      .join("");
    const labels = `<c:dLbls><c:numFmt formatCode="0%" sourceLinked="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${text(900, true, "FFFFFF")}<c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="1"/><c:showBubbleSize val="0"/><c:showLeaderLines val="0"/></c:dLbls>`;
    const ser = `<c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>${esc(s.name)}</c:v></c:tx>${points}${labels}<c:cat>${strRef(s.categoriesRef, s.categories)}</c:cat><c:val>${numRef(s.valuesRef, s.values, format)}</c:val></c:ser>`;
    plot =
      spec.type === "pie"
        ? `<c:pieChart><c:varyColors val="1"/>${ser}<c:firstSliceAng val="0"/></c:pieChart>`
        : `<c:doughnutChart><c:varyColors val="1"/>${ser}<c:firstSliceAng val="0"/><c:holeSize val="55"/></c:doughnutChart>`;
  } else {
    const sers = spec.series
      .map(
        (s, i) =>
          `<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:v>${esc(s.name)}</c:v></c:tx>${s.color ? `<c:spPr>${solid(s.color)}</c:spPr>` : ""}<c:invertIfNegative val="0"/><c:cat>${strRef(s.categoriesRef, s.categories)}</c:cat><c:val>${numRef(s.valuesRef, s.values, format)}</c:val></c:ser>`,
      )
      .join("");
    const grid = `<c:majorGridlines><c:spPr><a:ln w="6350">${solid("E1E6E4")}</a:ln></c:spPr></c:majorGridlines>`;
    const axisLine = `<c:spPr><a:ln w="6350">${solid("C9D1CE")}</a:ln></c:spPr>`;
    plot =
      `<c:barChart><c:barDir val="${spec.type === "bar" ? "bar" : "col"}"/><c:grouping val="clustered"/><c:varyColors val="0"/>${sers}<c:gapWidth val="60"/><c:axId val="111"/><c:axId val="222"/></c:barChart>` +
      `<c:catAx><c:axId val="111"/><c:scaling><c:orientation val="${spec.type === "bar" ? "maxMin" : "minMax"}"/></c:scaling><c:delete val="0"/><c:axPos val="${spec.type === "bar" ? "l" : "b"}"/><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>${axisLine}${text(900)}<c:crossAx val="222"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>` +
      `<c:valAx><c:axId val="222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${spec.type === "bar" ? "t" : "l"}"/>${grid}<c:numFmt formatCode="${esc(format)}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln><a:noFill/></a:ln></c:spPr>${text(900)}<c:crossAx val="111"/><c:crosses val="${spec.type === "bar" ? "max" : "autoZero"}"/><c:crossBetween val="between"/></c:valAx>`;
  }

  const legend =
    spec.series.length > 1 || spec.type === "pie" || spec.type === "doughnut"
      ? `<c:legend><c:legendPos val="${spec.type === "column" || spec.type === "bar" ? "b" : "r"}"/><c:overlay val="0"/>${text(900)}</c:legend>`
      : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="${NS.c}" xmlns:a="${NS.a}" xmlns:r="${NS.r}"><c:roundedCorners val="0"/><c:chart>${title}<c:plotArea><c:layout/>${plot}</c:plotArea>${legend}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart><c:spPr>${solid("FFFFFF")}<a:ln w="9525">${solid("E1E6E4")}</a:ln></c:spPr></c:chartSpace>`;
}

function drawingXml(charts: { spec: ChartSpec; relId: string }[]) {
  const anchors = charts
    .map(({ spec, relId }, i) => {
      const [fc, fr] = spec.from;
      const [tc, tr] = spec.to;
      return `<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${fc}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${fr}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${tc}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${tr}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${i + 2}" name="${esc(spec.title)}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="${NS.c}"><c:chart xmlns:c="${NS.c}" xmlns:r="${NS.r}" r:id="${relId}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="${NS.xdr}" xmlns:a="${NS.a}">${anchors}</xdr:wsDr>`;
}

const relsXml = (rels: { id: string; type: string; target: string }[]) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${NS.rel}">${rels.map((r) => `<Relationship Id="${r.id}" Type="${r.type}" Target="${r.target}"/>`).join("")}</Relationships>`;

// Elements a worksheet may have after <drawing>, in schema order; <drawing> goes before the first.
const AFTER_DRAWING = ["legacyDrawing", "legacyDrawingHF", "picture", "oleObjects", "controls", "webPublishItems", "tableParts", "extLst"];

// The worksheet's own child elements and where each starts. Nested elements (an <extLst> inside a
// conditional format, say) are skipped, so the drawing lands at the sheet's level.
function topLevelChildren(xml: string) {
  const out: { name: string; at: number }[] = [];
  let depth = 0;
  for (const m of xml.matchAll(/<(\/?)([A-Za-z][\w:.-]*)[^>]*?(\/?)>/g)) {
    const [, closing, name, selfClosing] = m;
    if (closing) {
      depth -= 1;
      continue;
    }
    if (depth === 1) out.push({ name, at: m.index });
    if (!selfClosing) depth += 1;
  }
  return out;
}

export async function addCharts(xlsx: Buffer | Uint8Array, specs: ChartSpec[]): Promise<Buffer> {
  if (!specs.length) return Buffer.from(xlsx);
  const zip = await JSZip.loadAsync(xlsx);
  const read = async (path: string) => (await zip.file(path)?.async("string")) ?? null;

  const workbook = (await read("xl/workbook.xml"))!;
  const workbookRels = (await read("xl/_rels/workbook.xml.rels"))!;
  let contentTypes = (await read("[Content_Types].xml"))!;

  const sheetPath = (name: string) => {
    const sheet = [...workbook.matchAll(/<sheet\b[^>]*>/g)].map((m) => m[0]).find((tag) => tag.includes(`name="${esc(name)}"`));
    const rid = sheet?.match(/r:id="([^"]+)"/)?.[1];
    const target = [...workbookRels.matchAll(/<Relationship\b[^>]*>/g)]
      .map((m) => m[0])
      .find((tag) => tag.includes(`Id="${rid}"`))
      ?.match(/Target="([^"]+)"/)?.[1];
    if (!target) throw new Error(`No sheet called ${name}`);
    return `xl/${target.replace(/^\/?xl\//, "")}`;
  };

  let chartNo = Object.keys(zip.files).filter((f) => /^xl\/charts\/chart\d+\.xml$/.test(f)).length;
  let drawingNo = Object.keys(zip.files).filter((f) => /^xl\/drawings\/drawing\d+\.xml$/.test(f)).length;

  for (const sheetName of [...new Set(specs.map((s) => s.sheet))]) {
    const onSheet = specs.filter((s) => s.sheet === sheetName);
    drawingNo += 1;
    const drawingRels: { id: string; type: string; target: string }[] = [];
    const placed = onSheet.map((spec, i) => {
      chartNo += 1;
      zip.file(`xl/charts/chart${chartNo}.xml`, chartXml(spec));
      contentTypes = contentTypes.replace(
        "</Types>",
        `<Override PartName="/xl/charts/chart${chartNo}.xml" ContentType="${CT_CHART}"/></Types>`,
      );
      const relId = `rId${i + 1}`;
      drawingRels.push({ id: relId, type: REL_CHART, target: `../charts/chart${chartNo}.xml` });
      return { spec, relId };
    });
    zip.file(`xl/drawings/drawing${drawingNo}.xml`, drawingXml(placed));
    zip.file(`xl/drawings/_rels/drawing${drawingNo}.xml.rels`, relsXml(drawingRels));
    contentTypes = contentTypes.replace(
      "</Types>",
      `<Override PartName="/xl/drawings/drawing${drawingNo}.xml" ContentType="${CT_DRAWING}"/></Types>`,
    );

    // Link the sheet to its drawing, next to any links ExcelJS already wrote (tables, hyperlinks).
    const path = sheetPath(sheetName);
    const relsPath = path.replace(/worksheets\/(sheet\d+\.xml)$/, "worksheets/_rels/$1.rels");
    const existing = await read(relsPath);
    const relId = "rIdChartsDrawing";
    const rel = `<Relationship Id="${relId}" Type="${REL_DRAWING}" Target="../drawings/drawing${drawingNo}.xml"/>`;
    zip.file(
      relsPath,
      existing ? existing.replace("</Relationships>", `${rel}</Relationships>`) : relsXml([]).replace("</Relationships>", `${rel}</Relationships>`),
    );

    let sheetXml = (await read(path))!;
    if (!sheetXml.includes(`xmlns:r="${NS.r}"`)) {
      sheetXml = sheetXml.replace("<worksheet ", `<worksheet xmlns:r="${NS.r}" `);
    }
    const drawingTag = `<drawing r:id="${relId}"/>`;
    const next = topLevelChildren(sheetXml).find((c) => AFTER_DRAWING.includes(c.name));
    const at = next ? next.at : sheetXml.lastIndexOf("</worksheet>");
    sheetXml = sheetXml.slice(0, at) + drawingTag + sheetXml.slice(at);
    zip.file(path, sheetXml);
  }

  zip.file("[Content_Types].xml", contentTypes);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
