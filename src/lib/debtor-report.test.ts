import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "./i18n.ts";
import {
  ageBand,
  clientKey,
  clientOptions,
  debtFilterSearch,
  fileSlug,
  groupDebtors,
  owedByAge,
  parseDebtFilters,
  parseDebtScope,
  type ClientJob,
} from "./debtor-report.ts";

const job = (id: number, customer: string | null, amount: number, paid: number, days: number, at = "2026-11-01"): ClientJob => ({
  id,
  at,
  customer,
  plate: null,
  car: null,
  invoice_number: null,
  description: null,
  rate_per_tonne: null,
  tonnes: null,
  unit: "tonne",
  destination: null,
  amount,
  paid,
  days,
});

test("groups a client's jobs whatever the case or spacing of the name", () => {
  const d = groupDebtors([job(1, "Kagera Sugar", 500, 100, 40), job(2, "  kagera  sugar ", 300, 0, 5), job(3, "Juma", 100, 0, 2)]);
  assert.equal(d.length, 2);
  assert.equal(d[0].customer, "Kagera Sugar");
  assert.deepEqual([d[0].amount, d[0].paid, d[0].owed, d[0].days, d[0].jobs.length], [800, 100, 700, 40, 2]);
});

test("puts the largest debt first, then the oldest", () => {
  const d = groupDebtors([job(1, "A", 100, 0, 3), job(2, "B", 300, 0, 1), job(3, "C", 100, 0, 50)]);
  assert.deepEqual(d.map((x) => x.customer), ["B", "C", "A"]);
});

test("keeps each client's jobs oldest first", () => {
  const d = groupDebtors([job(2, "A", 100, 0, 1, "2026-11-10"), job(1, "A", 100, 0, 9, "2026-11-02")]);
  assert.deepEqual(d[0].jobs.map((j) => j.id), [1, 2]);
});

test("names a debt without a client", () => {
  assert.equal(groupDebtors([job(1, null, 100, 0, 1)])[0].customer, "Bila jina");
  assert.equal(groupDebtors([job(1, " ", 100, 0, 1)], en)[0].customer, "No name");
});

test("puts what is owed into age bands", () => {
  assert.deepEqual([0, 30, 31, 60, 61, 90, 91, 400].map(ageBand), [0, 0, 1, 1, 2, 2, 3, 3]);
  assert.deepEqual(owedByAge([job(1, "A", 500, 100, 10), job(2, "A", 200, 0, 45), job(3, "B", 50, 0, 120)]), [400, 200, 0, 50]);
});

test("reads the scope from the URL", () => {
  assert.equal(parseDebtScope("kipindi"), "period");
  assert.equal(parseDebtScope(undefined), "all");
  assert.equal(parseDebtScope("anything"), "all");
});

test("leaves paid jobs out of the age bands and the days owed", () => {
  const d = groupDebtors([job(1, "A", 500, 500, 80), job(2, "A", 200, 50, 10), job(3, "B", 300, 300, 40)]);
  assert.deepEqual(d.map((x) => [x.customer, x.owed, x.days]), [["A", 150, 10], ["B", 0, 0]]);
  assert.deepEqual(owedByAge([job(1, "A", 500, 500, 80), job(2, "A", 200, 50, 10)]), [150, 0, 0, 0]);
});

test("puts clients who have paid everything after those who owe, biggest first", () => {
  const d = groupDebtors([job(1, "Small", 100, 100, 1), job(2, "Big", 900, 900, 1), job(3, "Owes", 50, 0, 1)]);
  assert.deepEqual(d.map((x) => x.customer), ["Owes", "Big", "Small"]);
});

test("matches client names ignoring case and spaces", () => {
  assert.equal(clientKey("  Kagera   SUGAR "), "kagera sugar");
  assert.equal(clientKey(null), "");
  assert.deepEqual(clientOptions(["Kagera Sugar", "kagera  sugar", "Bakhresa", " "]), [
    { key: "bakhresa", name: "Bakhresa" },
    { key: "kagera sugar", name: "Kagera Sugar" },
  ]);
});

test("reads the debt filters from the URL and writes back only what differs", () => {
  assert.deepEqual(parseDebtFilters({}), { scope: "all", client: null, withPaid: false });
  const f = parseDebtFilters({ madeni: "kipindi", mteja: " Kagera Sugar ", hali: "zote" });
  assert.deepEqual(f, { scope: "period", client: "kagera sugar", withPaid: true });
  assert.equal(debtFilterSearch(f), "&madeni=kipindi&mteja=kagera%20sugar&hali=zote");
  assert.equal(debtFilterSearch(parseDebtFilters({ hali: "nyingine", mteja: "  " })), "");
});

test("turns a client name into a filename part", () => {
  assert.equal(fileSlug("Kagera Sugar Ltd."), "kagera_sugar_ltd");
  assert.equal(fileSlug("Mama Ñaña & Sons"), "mama_nana_sons");
  assert.equal(fileSlug("!!!"), "mteja");
});
