import assert from "node:assert/strict";
import { test } from "node:test";
import { checkEmail, parseIncome, parseMoneyRequest } from "./validation.ts";

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

test("income needs a source and amount; the description is optional", () => {
  assert.deepEqual(parseIncome({ source: " Safari ya Arusha ", amount: "350,000", description: "  " }), {
    ok: true,
    source: "Safari ya Arusha",
    amount: "350000",
    description: null,
  });
  const described = parseIncome({ source: "Kukodisha Hiace", amount: "120000", description: " Siku 2 " });
  assert.equal(described.ok && described.description, "Siku 2");
});

test("income reports each bad field", () => {
  const result = parseIncome({ source: " ", amount: "12.50", description: "x".repeat(501) });
  assert.ok(!result.ok && result.errors.source && result.errors.amount && result.errors.description);
  assert.equal(parseIncome({ source: "x".repeat(121), amount: "1000", description: "" }).ok, false);
  assert.equal(parseIncome({ source: "Mteja", amount: "100,000,000", description: "" }).ok, false);
});

test("checks manager emails loosely", () => {
  assert.equal(checkEmail("asha@kampuni.co.tz"), undefined);
  for (const bad of ["", "asha", "asha@", "@kampuni.co.tz", "asha@kampuni", "a sha@kampuni.co.tz"]) {
    assert.ok(checkEmail(bad), bad);
  }
});
