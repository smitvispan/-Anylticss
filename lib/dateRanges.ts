// lib/dateRanges.ts
export type YMD = `${number}-${number}-${number}`;

function toYMD(d: Date): YMD {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}` as YMD;
}

function parseYMD(ymd: string): Date {
  // Parse as local date at midnight
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

/**
 * Given an inclusive range [startYMD, endYMD], returns the previous period
 * of equal length ending the day before `startYMD`.
 * Example: 2025-08-01..2025-08-07  ->  2025-07-25..2025-07-31
 */
export function getPreviousPeriod(startYMD: string, endYMD: string) {
  const start = parseYMD(startYMD);
  const end = parseYMD(endYMD);

  // inclusive length in days
  const msPerDay = 24 * 60 * 60 * 1000;
  const lengthDays = Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;

  const prevEnd = new Date(start.getTime() - msPerDay);                // day before current start
  const prevStart = new Date(prevEnd.getTime() - (lengthDays - 1) * msPerDay);

  return { start: toYMD(prevStart), end: toYMD(prevEnd) };
}

/**
 * Same calendar dates in the previous year.
 * Example: 2025-08-01..2025-08-07  ->  2024-08-01..2024-08-07
 * Handles Feb 29 by clamping to Feb 28 on non-leap years.
 */
export function getSameRangeLastYear(startYMD: string, endYMD: string) {
  const start = parseYMD(startYMD);
  const end = parseYMD(endYMD);

  const lyStart = new Date(start);
  lyStart.setFullYear(start.getFullYear() - 1);

  const lyEnd = new Date(end);
  lyEnd.setFullYear(end.getFullYear() - 1);

  // clamp Feb 29 → Feb 28 if needed
  const clamp = (d: Date) => {
    if (d.getMonth() === 1 && d.getDate() === 29) d.setDate(28);
    return d;
  };

  return { start: toYMD(clamp(lyStart)), end: toYMD(clamp(lyEnd)) };
}
