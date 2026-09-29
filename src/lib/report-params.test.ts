import assert from "node:assert/strict";
import { test } from "node:test";
import { parseReportParams, periodLabel, periodStarts, presets, toSearch } from "./report-params.ts";

const today = "2026-09-29";

test("defaults to this month, all cars, grouped by car", () => {
  assert.deepEqual(parseReportParams({}, today), { carIds: [], from: "2026-09-01", to: today, group: "car" });
});

test("reads cars, dates and grouping; drops junk and duplicates", () => {
  const p = parseReportParams({ cars: ["3", "1", "3", "x", "-2"], from: "2026-07-01", to: "2026-08-31", group: "week" }, today);
  assert.deepEqual(p, { carIds: [3, 1], from: "2026-07-01", to: "2026-08-31", group: "week" });
});

test("ignores impossible dates and swaps a reversed range", () => {
  assert.equal(parseReportParams({ from: "2026-02-30" }, today).from, "2026-09-01");
  const p = parseReportParams({ from: "2026-09-10", to: "2026-09-01" }, today);
  assert.deepEqual([p.from, p.to], ["2026-09-01", "2026-09-10"]);
});

test("round-trips through the query string", () => {
  const p = parseReportParams({ cars: ["2", "5"], from: "2026-01-01", to: "2026-03-31", group: "month" }, today);
  assert.deepEqual(parseReportParams(Object.fromEntries(
    [...new URLSearchParams(toSearch(p))].reduce((m, [k, v]) => m.set(k, m.has(k) ? [m.get(k)].flat().concat(v) : v), new Map()),
  ), today), p);
});

test("month periods cover partial months at both ends", () => {
  assert.deepEqual(periodStarts("2026-07-15", "2026-09-02", "month"), ["2026-07-01", "2026-08-01", "2026-09-01"]);
});

test("week periods start on Monday", () => {
  // 2026-09-29 is a Tuesday; 2026-09-13 is a Sunday.
  assert.deepEqual(periodStarts("2026-09-13", "2026-09-29", "week"), ["2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28"]);
});

test("labels", () => {
  assert.equal(periodLabel("2026-09-01", "month"), "Sep 2026");
  assert.equal(periodLabel("2026-09-28", "week"), "Wiki ya 28 Sep 2026");
});

test("presets handle January", () => {
  const [, lastMonth, last3] = presets("2027-01-10");
  assert.deepEqual(lastMonth, { label: "Mwezi uliopita", from: "2026-12-01", to: "2026-12-31" });
  assert.equal(last3.from, "2026-11-01");
});
