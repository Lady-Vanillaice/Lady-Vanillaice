/** Clip overlapping slots/bookings to the selected Berlin calendar day. */
export function getTimelineBounds(
  dayStart: number,
  dayEnd: number,
  starts: number[],
  ends: number[],
) {
  return {
    start: Math.max(dayStart, Math.min(...starts)),
    end: Math.min(dayEnd, Math.max(...ends)),
  };
}

/** Reserve space for both endpoints, including a partial final hour. */
export function getTimelineLabelTicks(start: number, end: number, zoom: number) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
  const hour = 3_600_000;
  const minGap = (end - start) / (4 * Math.max(1, Math.min(6, zoom)));
  const labels = [start];
  // Berlin's UTC offsets are whole hours, so this also finds Berlin hour ticks
  // when the visitor's device uses another time zone.
  for (let t = Math.ceil(start / hour) * hour; t < end; t += hour) {
    if (t - labels[labels.length - 1] >= minGap && end - t >= minGap) {
      labels.push(t);
    }
  }
  return [...labels, end];
}
