import assert from "node:assert/strict";
import { test } from "node:test";
import { stretchesFor, totalsOf, type Fill, type Reading } from "./fuel-calc.ts";

const DAY = 86_400_000;
const reading = (id: number, day: number, odometer: number, eighths: number, driverId = 1): Reading => ({
  id,
  at: day * DAY,
  odometer,
  eighths,
  driverId,
});
const fill = (day: number, amount: number, price = 3000): Fill => ({ at: day * DAY, amount, litres: amount / price });

// The worked example: 60 L tank, TSh 3,000 a litre.
const readings = [reading(1, 1, 45_200, 4), reading(2, 3, 45_500, 2), reading(3, 6, 45_800, 1)];
const fills = [fill(3.1, 60_000)];

test("measures km and litres used between readings", () => {
  const [a, b] = stretchesFor(readings, fills, 60, 3000);
  assert.equal(a.km, 300);
  assert.equal(a.litresUsed, 15);
  assert.equal(a.kmPerLitre, 20);
  assert.equal(b.litresAdded, 20);
  assert.equal(b.litresUsed, 27.5);
  assert.equal(b.cost, 82_500);
});

test("flags a stretch far worse than the car's others", () => {
  const [a, b] = stretchesFor(readings, fills, 60, 3000);
  assert.equal(a.flag, null);
  assert.equal(b.flag, "thirsty");
});

test("gives each stretch to the driver of its first reading", () => {
  const handover = [reading(1, 1, 1000, 8, 1), reading(2, 2, 1100, 6, 2), reading(3, 3, 1250, 3, 2)];
  assert.deepEqual(stretchesFor(handover, [], 60, null).map((s) => s.driverId), [1, 2]);
});

test("ignores fuel paid before the first reading", () => {
  const [s] = stretchesFor([reading(1, 2, 0, 4), reading(2, 3, 150, 2)], [fill(1, 30_000)], 60, 3000);
  assert.equal(s.litresAdded, 0);
  assert.equal(s.litresUsed, 15);
});

test("flags a tank that rose with nothing paid", () => {
  const [s] = stretchesFor([reading(1, 1, 0, 2), reading(2, 2, 100, 6)], [], 60, 3000);
  assert.equal(s.flag, "gained");
  assert.equal(s.kmPerLitre, null);
  assert.equal(s.cost, 0);
});

test("flags fuel gone while the car stood still", () => {
  const [s] = stretchesFor([reading(1, 1, 500, 8), reading(2, 2, 505, 5)], [], 60, 3000);
  assert.equal(s.flag, "idle");
});

test("a fill with no known price adds no litres", () => {
  const [s] = stretchesFor(
    [reading(1, 1, 0, 2), reading(2, 2, 200, 2)],
    [{ at: 1.5 * DAY, amount: 50_000, litres: null }],
    60,
    null,
  );
  assert.equal(s.litresAdded, 0);
  assert.equal(s.cost, 0);
});

test("totals cancel one misread gauge across two stretches", () => {
  // The middle reading says ⅜ when it was really ¼: one stretch looks better, the next worse.
  const misread = [reading(1, 1, 0, 8), reading(2, 2, 300, 3), reading(3, 3, 600, 2)];
  const t = totalsOf(stretchesFor(misread, [fill(2.1, 60_000)], 60, 3000));
  assert.equal(t.km, 600);
  assert.equal(t.litres, 60 + 20 - 15);
  assert.equal(t.stretches, 2);
  assert.equal(t.costPerKm, (65 * 3000) / 600);
});
