# interval-merge

Combine and split half-open `[start, end)` intervals: merge overlaps, subtract one set of ranges from another, intersect multiple sets, and insert a single range into a set.

## Usage

```js
import { merge, subtract, intersect, insert } from "interval-merge";

merge([[1, 4], [3, 6], [8, 10]]);
// => [[1, 6], [8, 10]]

subtract([[0, 20]], [[3, 5], [10, 12]]);
// => [[0, 3], [5, 10], [12, 20]]

intersect([[[1, 5]], [[3, 7]]]);
// => [[3, 5]]

insert([[1, 3], [7, 9]], [2, 8]);
// => [[1, 9]]
```

## Why

Working with ranges — time windows, byte offsets, coverage tracks — you quickly need three operations the plain \"sort and dedupe\" loop does not give you: set subtraction, multi-way intersection, and insertion that keeps the list disjoint. This library provides exactly those four primitives and nothing else.

The trade-off is simplicity over generality. Intervals are plain `[number, number]` pairs, half-open, with finite numeric bounds. There is no streaming API, no custom comparator, no attach-your-own-data option. If you need to carry a payload alongside each range, map the results back yourself.

## Edge cases

Intervals are half-open: `[1, 3)` and `[3, 5)` share the point `3` between them, so `merge` collapses them into `[1, 5)`. This is the one decision that will surprise you if you expected closed ranges. Empty intervals `[x, x)` are silently dropped by every operation. Reversed pairs `[5, 3]` are normalised to `[3, 5]`. Non-finite values (`NaN`, `Infinity`) throw `TypeError`.
