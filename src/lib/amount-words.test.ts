import assert from "node:assert/strict";
import { test } from "node:test";
import { numberInWords, shillingsInWords } from "./amount-words.ts";

test("small numbers", () => {
  assert.equal(numberInWords(0), "sifuri");
  assert.equal(numberInWords(7), "saba");
  assert.equal(numberInWords(10), "kumi");
  assert.equal(numberInWords(11), "kumi na moja");
  assert.equal(numberInWords(40), "arobaini");
  assert.equal(numberInWords(99), "tisini na tisa");
});

test("hundreds and thousands", () => {
  assert.equal(numberInWords(100), "mia moja");
  assert.equal(numberInWords(125), "mia moja ishirini na tano");
  assert.equal(numberInWords(1000), "elfu moja");
  assert.equal(numberInWords(1500), "elfu moja, mia tano");
  assert.equal(numberInWords(40000), "elfu arobaini");
  assert.equal(numberInWords(45500), "elfu arobaini na tano, mia tano");
});

test("laki, milioni and bilioni", () => {
  assert.equal(numberInWords(100000), "laki moja");
  assert.equal(numberInWords(150000), "laki moja, elfu hamsini");
  assert.equal(numberInWords(1000000), "milioni moja");
  assert.equal(numberInWords(1234567), "milioni moja, laki mbili, elfu thelathini na nne, mia tano sitini na saba");
  assert.equal(numberInWords(250000000), "milioni mia mbili hamsini");
  assert.equal(numberInWords(2000000000), "bilioni mbili");
});

test("an amount from the database reads as shillings, rounded to whole", () => {
  assert.equal(shillingsInWords("85250.00"), "Shilingi elfu themanini na tano, mia mbili hamsini tu");
  assert.equal(shillingsInWords(40000.4), "Shilingi elfu arobaini tu");
});
