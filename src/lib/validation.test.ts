import assert from "node:assert/strict";
import { test } from "node:test";
import { parseMoneyRequest } from "./validation.ts";

test("accepts a whole amount and normalises to two decimals", () => {
  assert.deepEqual(parseMoneyRequest({ amount: " 40 ", reason: "  Fuel  " }), {
    ok: true,
    amount: "40.00",
    reason: "Fuel",
  });
});

test("accepts cents", () => {
  const result = parseMoneyRequest({ amount: "12.5", reason: "Parking" });
  assert.equal(result.ok && result.amount, "12.50");
});

for (const amount of ["", "abc", "-5", "1.234", "1e3", "12,50"]) {
  test(`rejects malformed amount ${JSON.stringify(amount)}`, () => {
    const result = parseMoneyRequest({ amount, reason: "Fuel" });
    assert.equal(result.ok, false);
    assert.ok(!result.ok && result.errors.amount);
  });
}

test("rejects zero and amounts over the column limit", () => {
  assert.equal(parseMoneyRequest({ amount: "0", reason: "Fuel" }).ok, false);
  assert.equal(parseMoneyRequest({ amount: "100000000", reason: "Fuel" }).ok, false);
});

test("requires a meaningful reason within the length limit", () => {
  const short = parseMoneyRequest({ amount: "10", reason: " a " });
  assert.ok(!short.ok && short.errors.reason && !short.errors.amount);
  const long = parseMoneyRequest({ amount: "10", reason: "x".repeat(501) });
  assert.ok(!long.ok && long.errors.reason);
});
