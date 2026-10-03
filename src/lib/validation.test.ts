import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkEmail,
  checkReceiptImage,
  checkOdometer,
  MAX_KM_BETWEEN_READINGS,
  MAX_RECEIPT_BYTES,
  parseCarChoice,
  parseEntryDate,
  parseIncome,
  parseMoneyRequest,
  parsePricePerLitre,
  parseReading,
  parseTankLitres,
} from "./validation.ts";

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

test("a manager's request names a car or none", () => {
  assert.deepEqual(parseCarChoice("4"), { carId: 4 });
  assert.deepEqual(parseCarChoice("none"), { carId: null });
  for (const bad of ["", "0", "-2", "abc", "1.5"]) assert.ok("error" in parseCarChoice(bad), bad);
});

test("income needs a car and amount; the description is optional", () => {
  assert.deepEqual(parseIncome({ carId: "3", amount: "350,000", description: "  " }), {
    ok: true,
    carId: 3,
    amount: "350000",
    description: null,
  });
  const described = parseIncome({ carId: "1", amount: "120000", description: " Safari ya Arusha " });
  assert.equal(described.ok && described.description, "Safari ya Arusha");
});

test("income reports each bad field", () => {
  const result = parseIncome({ carId: "", amount: "12.50", description: "x".repeat(501) });
  assert.ok(!result.ok && result.errors.carId && result.errors.amount && result.errors.description);
  assert.equal(parseIncome({ carId: "abc", amount: "1000", description: "" }).ok, false);
  assert.equal(parseIncome({ carId: "0", amount: "1000", description: "" }).ok, false);
  assert.equal(parseIncome({ carId: "2", amount: "100,000,000", description: "" }).ok, false);
});

test("checks manager emails loosely", () => {
  assert.equal(checkEmail("asha@kampuni.co.tz"), undefined);
  for (const bad of ["", "asha", "asha@", "@kampuni.co.tz", "asha@kampuni", "a sha@kampuni.co.tz"]) {
    assert.ok(checkEmail(bad), bad);
  }
});

test("reads an odometer with or without commas and a gauge mark", () => {
  assert.deepEqual(parseReading({ odometer: "45,500", gauge: "2" }), { ok: true, odometer: 45500, eighths: 2 });
  assert.deepEqual(parseReading({ odometer: " 0 ", gauge: "8" }), { ok: true, odometer: 0, eighths: 8 });
});

for (const [odometer, gauge] of [["", "2"], ["45.5", "2"], ["-3", "2"], ["10000000", "2"], ["100", ""], ["100", "9"], ["100", "1.5"]]) {
  test(`rejects reading ${JSON.stringify([odometer, gauge])}`, () => {
    assert.equal(parseReading({ odometer, gauge }).ok, false);
  });
}

test("an odometer may not go back, and a driver's may not leap", () => {
  assert.equal(checkOdometer(500, null, true), undefined);
  assert.equal(checkOdometer(500, 500, true), undefined);
  assert.ok(checkOdometer(499, 500, true));
  assert.ok(checkOdometer(500 + MAX_KM_BETWEEN_READINGS + 1, 500, true));
  assert.equal(checkOdometer(500 + MAX_KM_BETWEEN_READINGS + 1, 500, false), undefined);
});

test("checks fuel prices and tank sizes", () => {
  assert.deepEqual(parsePricePerLitre("2,950"), { price: 2950 });
  assert.ok("error" in parsePricePerLitre("0"));
  assert.deepEqual(parseTankLitres("45"), { litres: 45 });
  assert.ok("error" in parseTankLitres("5"));
  assert.ok("error" in parseTankLitres("45.5"));
});

test("knows a receipt photo by its first bytes", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);
  assert.deepEqual(checkReceiptImage(jpeg), { contentType: "image/jpeg" });
  assert.deepEqual(checkReceiptImage(png), { contentType: "image/png" });
  assert.deepEqual(checkReceiptImage(webp), { contentType: "image/webp" });
  assert.ok("error" in checkReceiptImage(new Uint8Array()));
  assert.ok("error" in checkReceiptImage(new TextEncoder().encode("<svg onload=alert(1)>")));
  const big = new Uint8Array(MAX_RECEIPT_BYTES + 1);
  big.set([0xff, 0xd8, 0xff]);
  assert.ok("error" in checkReceiptImage(big));
});

test("a past date is history; today, empty and bad dates are not", () => {
  const today = "2026-10-03";
  assert.deepEqual(parseEntryDate("", today), { date: null });
  assert.deepEqual(parseEntryDate("2026-10-03", today), { date: null });
  assert.deepEqual(parseEntryDate(" 2026-05-14 ", today), { date: "2026-05-14" });
  assert.ok("error" in parseEntryDate("2026-10-04", today));
  assert.ok("error" in parseEntryDate("2026-02-30", today));
  assert.ok("error" in parseEntryDate("2026-01-32", today));
  assert.ok("error" in parseEntryDate("14/05/2026", today));
  assert.ok("error" in parseEntryDate("2014-12-31", today));
});
