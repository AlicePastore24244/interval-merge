/**
 * Core interval-merge primitives.
 *
 * An interval is a half-open range [start, end) where start <= end.
 * The empty interval [x, x) is always valid and is treated as containing
 * no points. All operations preserve the half-open invariant.
 */

/**
 * Validate that a value is a finite number usable as an interval boundary.
 * We reject NaN and Infinity because they make ordering ill-defined and
 * silently produce surprising merges. String/number coercion is not done
 * because it hides caller bugs.
 *
 * @param {unknown} v
 * @returns {number}
 */
function checkFinite(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new TypeError(`interval boundary must be a finite number, got: ${String(v)}`);
  }
  return v;
}

/**
 * Normalise a single interval to [start, end) with start <= end.
 * Returns null for the empty interval so callers can skip it uniformly.
 *
 * @param {[number, number]} iv
 * @returns {[number, number] | null}
 */
function normalise(iv) {
  if (!Array.isArray(iv) || iv.length !== 2) {
    throw new TypeError(`interval must be a [start, end] pair, got: ${String(iv)}`);
  }
  const a = checkFinite(iv[0]);
  const b = checkFinite(iv[1]);
  if (a <= b) return a === b ? null : [a, b];
  return [b, a];
}

/**
 * Compare two intervals by start, then by end. Used to sort before merging.
 *
 * @param {[number, number]} x
 * @param {[number, number]} y
 * @returns {number}
 */
function compareInterval(x, y) {
  if (x[0] !== y[0]) return x[0] < y[0] ? -1 : 1;
  if (x[1] !== y[1]) return x[1] < y[1] ? -1 : 1;
  return 0;
}

/**
 * Merge a list of intervals, removing overlaps and empty ranges.
 *
 * Two half-open intervals [a, b) and [c, d) with a <= c are considered
 * overlapping or adjacent when c <= b. The adjacency rule (c === b) is what
 * makes [1, 3) and [3, 5) collapse into [1, 5); this is the standard choice
 * for half-open ranges because the point 3 belongs to exactly one of them
 * and the union is contiguous.
 *
 * @param {Array<[number, number]>} intervals
 * @returns {Array<[number, number]>}
 */
export function merge(intervals) {
  if (!Array.isArray(intervals)) {
    throw new TypeError(`merge expects an array, got: ${String(intervals)}`);
  }
  const clean = [];
  for (const iv of intervals) {
    const n = normalise(iv);
    if (n) clean.push(n);
  }
  clean.sort(compareInterval);
  const out = [];
  for (const iv of clean) {
    const last = out[out.length - 1];
    if (last && iv[0] <= last[1]) {
      // Overlap or adjacency: extend the current interval. Because the
      // input is sorted by start, we only ever grow the end.
      if (iv[1] > last[1]) last[1] = iv[1];
    } else {
      out.push([iv[0], iv[1]]);
    }
  }
  return out;
}

/**
 * Subtract `subtrahend` intervals from `minuend` intervals.
 *
 * Returns the set difference minuend \ subtrahend as a list of disjoint,
 * non-empty intervals. Both inputs are first merged independently so the
 * result is well-defined regardless of overlaps within either list.
 *
 * The algorithm walks the two sorted, merged lists together. Because both
 * sides are disjoint and sorted, a single linear sweep suffices: for each
 * minuend interval we advance through the subtrahend intervals that could
 * overlap it, cutting holes as we go.
 *
 * @param {Array<[number, number]>} minuend
 * @param {Array<[number, number]>} subtrahend
 * @returns {Array<[number, number]>}
 */
export function subtract(minuend, subtrahend) {
  const A = merge(minuend);
  const B = merge(subtrahend);
  const out = [];
  let j = 0;
  for (let i = 0; i < A.length; i++) {
    let [lo, hi] = A[i];
    // Skip subtrahend intervals that end at or before lo — they cannot
    // overlap [lo, hi) and will never be relevant to a later, larger lo.
    while (j < B.length && B[j][1] <= lo) j++;
    let k = j;
    while (k < B.length && B[k][0] < hi) {
      const [bLo, bHi] = B[k];
      if (bLo > lo) out.push([lo, bLo]);
      // The next surviving piece starts at the end of this hole.
      lo = bHi > hi ? hi : bHi;
      if (lo >= hi) break;
      k++;
    }
    if (lo < hi) out.push([lo, hi]);
  }
  return out;
}

/**
 * Compute the intersection of all input lists.
 *
 * Each list is merged first, then we walk the resulting disjoint sorted
 * lists in lockstep. An intersection point exists only where intervals from
 * every list overlap, so we track the running maximum of starts and the
 * running minimum of ends; whenever maxStart < minEnd we emit an interval.
 *
 * @param {Array<Array<[number, number]>>} lists
 * @returns {Array<[number, number]>}
 */
export function intersect(lists) {
  if (!Array.isArray(lists)) {
    throw new TypeError(`intersect expects an array of lists, got: ${String(lists)}`);
  }
  const merged = lists.map((l) => merge(l));
  if (merged.length === 0) return [];
  const idx = new Array(merged.length).fill(0);
  const out = [];
  while (true) {
    // Find, for each list, the current interval and whether we have one.
    let maxStart = -Infinity;
    let minEnd = Infinity;
    let done = false;
    for (let i = 0; i < merged.length; i++) {
      // Advance past intervals that end at or before maxStart, since they
      // can no longer contribute to any overlap with the other lists.
      while (idx[i] < merged[i].length && merged[i][idx[i]][1] <= maxStart) {
        idx[i]++;
      }
      if (idx[i] >= merged[i].length) {
        done = true;
        break;
      }
      const [s, e] = merged[i][idx[i]];
      if (s > maxStart) maxStart = s;
      if (e < minEnd) minEnd = e;
    }
    if (done) break;
    if (maxStart < minEnd) {
      out.push([maxStart, minEnd]);
    }
    // Advance the list whose current interval ends first, because every
    // other list may still contribute to a later overlap.
    let adv = 0;
    for (let i = 1; i < merged.length; i++) {
      if (merged[i][idx[i]][1] < merged[adv][idx[adv]][1]) adv = i;
    }
    idx[adv]++;
  }
  return out;
}

/**
 * Insert a single interval into a list and return the merged result.
 *
 * This is a convenience wrapper around merge for the common one-at-a-time
 * case. It does not mutate the input list.
 *
 * @param {Array<[number, number]>} intervals
 * @param {[number, number]} interval
 * @returns {Array<[number, number]>}
 */
export function insert(intervals, interval) {
  return merge([...intervals, interval]);
}
