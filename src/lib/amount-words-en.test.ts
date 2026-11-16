import assert from "node:assert/strict";
import { test } from "node:test";
import { amountInEnglish, numberInEnglish } from "./amount-words-en.ts";

test("the amount reads like Zuraja's paper invoice, cents included", () => {
  assert.equal(
    amountInEnglish("170687729.40"),
    "Tanzanian Shillings One Hundred Seventy Million, Six Hundred Eighty-Seven Thousand, Seven Hundred Twenty-Nine and Forty Cents Only",
  );
  assert.equal(amountInEnglish(1350000), "Tanzanian Shillings One Million, Three Hundred Fifty Thousand Only");
  assert.equal(amountInEnglish("36400.00"), "Tanzanian Shillings Thirty-Six Thousand, Four Hundred Only");
  assert.equal(amountInEnglish(0.01), "Tanzanian Shillings Zero and One Cent Only");
  assert.equal(amountInEnglish(12.05), "Tanzanian Shillings Twelve and Five Cents Only");
  assert.equal(amountInEnglish(99.999), "Tanzanian Shillings One Hundred Only");
});

test("billions and trillions, skipping empty groups", () => {
  assert.equal(numberInEnglish(2_000_000_015), "Two Billion, Fifteen");
  assert.equal(numberInEnglish(1_000_000_000_000), "One Trillion");
  assert.equal(
    numberInEnglish(999_999_999_999_999),
    "Nine Hundred Ninety-Nine Trillion, Nine Hundred Ninety-Nine Billion, Nine Hundred Ninety-Nine Million, Nine Hundred Ninety-Nine Thousand, Nine Hundred Ninety-Nine",
  );
  assert.equal(numberInEnglish(4_500_000_100_000), "Four Trillion, Five Hundred Billion, One Hundred Thousand");
  assert.equal(numberInEnglish(110), "One Hundred Ten");
  assert.equal(numberInEnglish(20), "Twenty");
});

test("no words for an amount that isn't a positive one in range", () => {
  for (const bad of [0, -5, "abc", Number.NaN, 1e15, ""]) assert.equal(amountInEnglish(bad), null);
});
