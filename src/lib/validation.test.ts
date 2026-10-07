import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkEmail,
  checkReceiptImage,
  checkOdometer,
  MAX_KM_BETWEEN_READINGS,
  MAX_RECEIPT_BYTES,
  parseCargo,
  parseDebtPayment,
  parsePartPayment,
  parseCarChoice,
  parseEntryDate,
  parseFeedback,
  parseIncome,
  parseInvoice,
  parseMoneyRequest,
  parseFuelOrder,
  parseFuelPrice,
  parseLitres,
  parsePricePerLitre,
  parseReading,
  parseStartingReading,
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

test("a fuel request's price per litre is required and in shillings", () => {
  assert.deepEqual(parseFuelPrice("2,950"), { price: 2950 });
  assert.deepEqual(parseFuelPrice(" 3100 "), { price: 3100 });
  assert.ok("error" in parseFuelPrice(""));
  assert.ok("error" in parseFuelPrice("abc"));
  assert.ok("error" in parseFuelPrice("3"));
  assert.ok("error" in parseFuelPrice("0"));
  assert.ok("error" in parseFuelPrice("150,000"));
});

test("litres for a fuel request, whole or with decimals", () => {
  assert.deepEqual(parseLitres("20"), { litres: 20 });
  assert.deepEqual(parseLitres("20.5"), { litres: 20.5 });
  assert.deepEqual(parseLitres("20,5"), { litres: 20.5 });
  assert.deepEqual(parseLitres("1,200"), { litres: 1200 });
  assert.ok("error" in parseLitres(""));
  assert.ok("error" in parseLitres("0"));
  assert.ok("error" in parseLitres("abc"));
  assert.ok("error" in parseLitres("20.555"));
  assert.ok("error" in parseLitres("2001"));
});

test("a fuel request's amount is price times litres, in whole shillings", () => {
  assert.deepEqual(parseFuelOrder("3,125", "16"), { price: 3125, litres: 16, amount: 50000 });
  assert.deepEqual(parseFuelOrder("2,985", "20.5"), { price: 2985, litres: 20.5, amount: 61193 });
  assert.deepEqual(parseFuelOrder("", "abc"), {
    errors: { fuelPrice: "Andika bei ya lita moja kwenye kituo cha mafuta.", litres: "Andika lita kwa namba, mfano 20 au 20.5." },
  });
  assert.ok("errors" in parseFuelOrder("3,000", "0"));
});

test("cargo income is rate per tonne times tonnes, in whole shillings", () => {
  assert.deepEqual(parseCargo("45,000", "30", " Mwanza "), { rate: 45000, tonnes: 30, amount: 1350000, destination: "Mwanza" });
  assert.deepEqual(parseCargo("42500", "28,5", ""), { rate: 42500, tonnes: 28.5, amount: 1211250, destination: null });
  assert.deepEqual(parseCargo("", "abc", ""), {
    errors: { rate: "Andika bei kwa tani moja.", tonnes: "Andika tani kwa namba, mfano 30 au 28.5." },
  });
  assert.ok("errors" in parseCargo("45", "30", ""));
  assert.ok("errors" in parseCargo("45,000", "0", ""));
  assert.ok("errors" in parseCargo("45,000", "", ""));
  assert.ok("errors" in parseCargo("45,000", "10001", ""));
  assert.ok("errors" in parseCargo("99,000,000", "30", ""));
  assert.ok("errors" in parseCargo("45,000", "30", "x".repeat(121)));
});

test("reads a part payment: who owes, and from 0 up to under the total", () => {
  assert.deepEqual(parsePartPayment("200,000", " Kilimanjaro  Traders ", 1350000), { paid: 200000, customer: "Kilimanjaro Traders" });
  assert.deepEqual(parsePartPayment("0", "Juma", 500000), { paid: 0, customer: "Juma" });
  assert.deepEqual(parsePartPayment("", "", 500000), {
    errors: { customer: "Andika jina la mteja anayedaiwa.", paid: "Andika kiasi alicholipa sasa, au 0 kama hajalipa chochote." },
  });
  assert.ok("errors" in parsePartPayment("500,000", "Juma", 500000));
  assert.ok("errors" in parsePartPayment("600000", "Juma", 500000));
  assert.ok("errors" in parsePartPayment("abc", "Juma", 500000));
  assert.ok("errors" in parsePartPayment("1000", "J", 500000));
});

test("takes a payment on a debt up to what is still owed", () => {
  assert.deepEqual(parseDebtPayment("150,000", 300000), { amount: 150000 });
  assert.deepEqual(parseDebtPayment("300000", 300000), { amount: 300000 });
  assert.ok("error" in parseDebtPayment("300001", 300000));
  assert.ok("error" in parseDebtPayment("0", 300000));
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

test("a new car's starting reading is km and gauge together, or nothing", () => {
  assert.deepEqual(parseStartingReading({ odometer: "", gauge: "" }), { ok: true, reading: null });
  assert.deepEqual(parseStartingReading({ odometer: "45,500", gauge: "4" }), {
    ok: true,
    reading: { odometer: 45500, eighths: 4 },
  });
  const noGauge = parseStartingReading({ odometer: "45500", gauge: "" });
  assert.ok(!noGauge.ok && noGauge.errors.gauge && !noGauge.errors.odometer);
  const noKm = parseStartingReading({ odometer: " ", gauge: "8" });
  assert.ok(!noKm.ok && noKm.errors.odometer);
});

test("maoni are trimmed and need a few words, at most 1000 characters", () => {
  assert.deepEqual(parseFeedback("  Tunaomba mafunzo ya usalama barabarani.  "), { body: "Tunaomba mafunzo ya usalama barabarani." });
  assert.ok("error" in parseFeedback("  "));
  assert.ok("error" in parseFeedback("ok"));
  assert.ok("error" in parseFeedback("x".repeat(1001)));
});

test("an invoice adds up its trips, skips empty lines and checks each one", () => {
  const today = "2026-10-06";
  const base = { customer: " Kilimanjaro Traders ", contact: "", issuedOn: today, dueOn: "", payment: " CRDB 0150-123 " };
  const empty = { description: "", plate: "", tonnes: "", rate: "" };
  const ok = parseInvoice(
    {
      ...base,
      lines: [
        { description: "Dar es Salaam - Mwanza", plate: "t 456 bcd", tonnes: "30", rate: "45,000" },
        empty,
        { description: "Dar es Salaam - Dodoma", plate: "", tonnes: "12.5", rate: "38000" },
      ],
    },
    today,
  );
  assert.deepEqual(ok, {
    ok: true,
    invoice: {
      customer: "Kilimanjaro Traders",
      contact: null,
      issuedOn: today,
      dueOn: null,
      payment: "CRDB 0150-123",
      lines: [
        { description: "Dar es Salaam - Mwanza", plate: "T456BCD", tonnes: 30, rate: 45000, amount: 1350000 },
        { description: "Dar es Salaam - Dodoma", plate: null, tonnes: 12.5, rate: 38000, amount: 475000 },
      ],
      total: 1825000,
    },
  });

  const none = parseInvoice({ ...base, lines: [empty] }, today);
  assert.deepEqual(none, { ok: false, errors: { lines: "Ongeza angalau safari moja." } });

  const bad = parseInvoice(
    { ...base, customer: "", issuedOn: "2026-10-07", dueOn: "2026-10-01", lines: [empty, { description: "x", plate: "", tonnes: "0", rate: "45,000" }] },
    today,
  );
  assert.ok(!bad.ok);
  if (!bad.ok) {
    assert.ok(bad.errors.customer && bad.errors.issuedOn);
    assert.deepEqual(Object.keys(bad.errors.line ?? {}), ["1"]);
    assert.ok(bad.errors.line?.[1].description && bad.errors.line?.[1].tonnes && !bad.errors.line?.[1].rate);
  }
  const early = parseInvoice({ ...base, dueOn: "2026-10-01", lines: [{ description: "Kibaha", plate: "", tonnes: "1", rate: "40000" }] }, today);
  assert.ok(!early.ok && early.errors.dueOn);
});
