import { test } from "node:test";
import assert from "node:assert/strict";
import { merge, subtract, intersect, insert } from "../src/index.js";

// ---- merge ---------------------------------------------------------------

test("merge: empty input returns empty array", () => {
  assert.deepEqual(merge([]), []);
});

test("merge: single interval comes back unchanged", () => {
  assert.deepEqual(merge([[1, 5]]), [[1, 5]]);
});

test("merge: overlapping intervals collapse", () => {
  assert.deepEqual(merge([[1, 4], [3, 6]]), [[1, 6]]);
});

test("merge: adjacent intervals merge because half-open", () => {
  assert.deepEqual(merge([[1, 3], [3, 5]]), [[1, 5]]);
});

test("merge: fully nested interval is absorbed", () => {
  assert.deepEqual(merge([[1, 10], [4, 6]]), [[1, 10]]);
});

test("merge: disjoint intervals stay separate and sorted", () => {
  assert.deepEqual(merge([[5, 7], [1, 3]]), [[1, 3], [5, 7]]);
});

test("merge: empty intervals [x, x) are dropped", () => {
  assert.deepEqual(merge([[2, 2], [1, 4], [5, 5]]), [[1, 4]]);
});

test("merge: reversed pair [b, a] is normalised to [a, b]", () => {
  assert.deepEqual(merge([[6, 3]]), [[3, 6]]);
});

test("merge: does not mutate the input array", () => {
  const input = [[5, 7], [1, 3]];
  const snapshot = input.map((iv) => [...iv]);
  merge(input);
  assert.deepEqual(input, snapshot);
});

test("merge: rejects non-finite boundaries", () => {
  assert.throws(() => merge([[1, Infinity]]), TypeError);
  assert.throws(() => merge([[NaN, 5]]), TypeError);
});

// ---- subtract ------------------------------------------------------------

test("subtract: no overlap returns minuend unchanged", () => {
  assert.deepEqual(subtract([[1, 5]], [[5, 9]]), [[1, 5]]);
});

test("subtract: hole in the middle", () => {
  assert.deepEqual(subtract([[1, 10]], [[3, 6]]), [[1, 3], [6, 10]]);
});

test("subtract: subtrahend covers entire minuend", () => {
  assert.deepEqual(subtract([[1, 5]], [[0, 9]]), []);
});

test("subtract: subtrahend touches left edge", () => {
  assert.deepEqual(subtract([[1, 5]], [[1, 3]]), [[3, 5]]);
});

test("subtract: subtrahend touches right edge", () => {
  assert.deepEqual(subtract([[1, 5]], [[3, 5]]), [[1, 3]]);
});

test("subtract: multiple subtrahend pieces against one minuend", () => {
  assert.deepEqual(
    subtract([[0, 20]], [[3, 5], [10, 12], [7, 8]]),
    [[0, 3], [5, 7], [8, 10], [12, 20]],
  );
});

test("subtract: result is disjoint even with messy inputs", () => {
  const r = subtract([[1, 10], [2, 9], [4, 6]], [[3, 4], [3, 4]]);
  assert.deepEqual(r, [[1, 3], [4, 10]]);
});

// ---- intersect -----------------------------------------------------------

test("intersect: no lists returns empty", () => {
  assert.deepEqual(intersect([]), []);
});

test("intersect: single list is just merged", () => {
  assert.deepEqual(intersect([[[1, 3], [3, 5]]]), [[1, 5]]);
});

test("intersect: simple two-list overlap", () => {
  assert.deepEqual(intersect([[[1, 5]], [[3, 7]]]), [[3, 5]]);
});

test("intersect: disjoint lists produce empty", () => {
  assert.deepEqual(intersect([[[1, 3]], [[3, 5]]]), []);
});

test("intersect: three lists with a common middle range", () => {
  assert.deepEqual(
    intersect([[[0, 10]], [[3, 8]], [[5, 12]]]),
    [[5, 8]],
  );
});

test("intersect: multiple overlap regions", () => {
  assert.deepEqual(
    intersect([[[1, 4], [6, 10]], [[2, 8]]]),
    [[2, 4], [6, 8]],
  );
});

// ---- insert --------------------------------------------------------------

test("insert: into empty list", () => {
  assert.deepEqual(insert([], [2, 6]), [[2, 6]]);
});

test("insert: overlapping existing interval", () => {
  assert.deepEqual(insert([[1, 3], [7, 9]], [2, 8]), [[1, 9]]);
});

test("insert: does not mutate the input list", () => {
  const input = [[1, 3]];
  const snapshot = input.map((iv) => [...iv]);
  insert(input, [2, 5]);
  assert.deepEqual(input, snapshot);
});
