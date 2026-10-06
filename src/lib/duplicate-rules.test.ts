import assert from "node:assert/strict";
import { test } from "node:test";
import { amountLikeness, amountsMatch, parseDuplicateOk } from "./duplicate-rules.ts";

test("amounts within 5% of the larger one match", () => {
  assert.ok(amountsMatch(45000, 45000));
  assert.ok(amountsMatch(45000, 43000));
  assert.ok(amountsMatch(47250, 45000));
  assert.ok(!amountsMatch(47500, 45000));
  assert.ok(!amountsMatch(40000, 45000));
});

test("likeness is a whole percentage, 100 when equal", () => {
  assert.equal(amountLikeness(45000, 45000), 100);
  assert.equal(amountLikeness(45000, 44000), 98);
  assert.equal(amountLikeness(0, 0), 100);
});

test("the match a person chose to send anyway is a positive id", () => {
  assert.equal(parseDuplicateOk("12"), 12);
  assert.equal(parseDuplicateOk(""), null);
  assert.equal(parseDuplicateOk(null), null);
  assert.equal(parseDuplicateOk("-3"), null);
  assert.equal(parseDuplicateOk("1.5"), null);
});
