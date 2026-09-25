import assert from "node:assert/strict";
import { getTimelineBounds, getTimelineLabelTicks } from "../src/lib/calendar-timeline.ts";

const hour = 3_600_000;
const time = (value) => Date.parse(value);

// Both reported dates, on either side of the daylight-saving change.
for (const [date, offset] of [["2026-10-12", "+02:00"], ["2026-10-29", "+01:00"]]) {
  const dayStart = time(`${date}T00:00:00${offset}`);
  const dayEnd = dayStart + 24 * hour;
  const normal = getTimelineBounds(dayStart, dayEnd, [dayStart + 10 * hour], [dayEnd]);
  assert.deepEqual(normal, { start: dayStart + 10 * hour, end: dayEnd });
  // A slot or booking from a neighbouring date cannot stretch the day to 38 h.
  const overlapping = getTimelineBounds(dayStart, dayEnd,
    [dayStart - 14 * hour, dayStart + 10 * hour], [dayEnd, dayEnd + 8 * hour]);
  assert.deepEqual(overlapping, { start: dayStart, end: dayEnd });
}

// The DST transition is a real 25-hour Berlin day, not a fixed 24-hour period.
const autumnStart = time("2026-10-25T00:00:00+02:00");
const autumnEnd = time("2026-10-26T00:00:00+01:00");
assert.equal(getTimelineBounds(autumnStart, autumnEnd,
  [autumnStart - hour], [autumnEnd + hour]).end - autumnStart, 25 * hour);

for (const duration of [0.5, 3, 14, 24, 25, 38]) {
  for (const zoom of [1, 1.5, 2, 6]) {
    const start = time("2026-10-29T10:15:00+01:00");
    const end = start + duration * hour;
    const labels = getTimelineLabelTicks(start, end, zoom);
    assert.equal(labels[0], start);
    assert.equal(labels.at(-1), end);
    assert.equal(new Set(labels).size, labels.length);
    if (zoom === 1) assert.ok(labels.length <= 5);
    // At the minimum 20rem (320px) base width, adjacent labels are at least
    // 80px apart, including near the two edges and the partial final hour.
    for (let i = 1; i < labels.length; i++) {
      const gapPx = (labels[i] - labels[i - 1]) / (end - start) * 320 * zoom;
      assert.ok(gapPx >= 80 - 1e-8, `Labels overlap: ${duration}h, zoom ${zoom}`);
    }
  }
}
assert.deepEqual(getTimelineLabelTicks(0, 0, 1), []);
assert.deepEqual(getTimelineLabelTicks(NaN, 1, 1), []);
console.log("Calendar timeline regression checks passed.");
