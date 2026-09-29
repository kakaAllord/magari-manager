import assert from "node:assert/strict";
import { test } from "node:test";
import { parseMoneyRequest } from "./validation.ts";

test("accepts whole shillings and trims the reason", () => {
  assert.deepEqual(parseMoneyRequest({ amount: " 40000 ", reason: "  Fuel  " }), {
    ok: true,
    amount: "40000",
    reason: "Fuel",
  });
});

for (const [amount, expected] of [["40,000", "40000"], ["1,250,000", "1250000"], ["007", "7"]]) {
  test(`normalises ${JSON.stringify(amount)} to ${expected}`, () => {
    const result = parseMoneyRequest({ amount, reason: "Fuel" });
    assert.equal(result.ok && result.amount, expected);
  });
}

for (const amount of ["", "abc", "-5", "12.50", "1e3", "40,00", "4,0000", ",000", "40 000"]) {
  test(`rejects malformed amount ${JSON.stringify(amount)}`, () => {
    const result = parseMoneyRequest({ amount, reason: "Fuel" });
    assert.equal(result.ok, false);
    assert.ok(!result.ok && result.errors.amount);
  });
}

test("rejects zero and amounts over the column limit", () => {
  assert.equal(parseMoneyRequest({ amount: "0", reason: "Fuel" }).ok, false);
  assert.equal(parseMoneyRequest({ amount: "99,999,999", reason: "Fuel" }).ok, true);
  assert.equal(parseMoneyRequest({ amount: "100,000,000", reason: "Fuel" }).ok, false);
});

test("requires a meaningful reason within the length limit", () => {
  const short = parseMoneyRequest({ amount: "10000", reason: " a " });
  assert.ok(!short.ok && short.errors.reason && !short.errors.amount);
  const long = parseMoneyRequest({ amount: "10000", reason: "x".repeat(501) });
  assert.ok(!long.ok && long.errors.reason);
});
