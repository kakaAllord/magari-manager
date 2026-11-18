import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "./i18n.ts";
import { ageBand, groupDebtors, owedByAge, parseDebtScope, type UnpaidJob } from "./debtor-report.ts";

const job = (id: number, customer: string | null, amount: number, paid: number, days: number, at = "2026-11-01"): UnpaidJob => ({
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
