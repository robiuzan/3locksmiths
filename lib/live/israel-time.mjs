/**
 * Israel's UTC offset for a wall-clock date and hour — the two-line DST rule, as data-free
 * arithmetic, so nothing that ships or gates has to ask `Intl` (CI runs Node 20, the workstation
 * Node 24, and the enrich chain may not depend on the platform's ICU).
 *
 * The rule (in force since 2013): summer time starts at 02:00 on the Friday before the last
 * Sunday of March and ends at 02:00 on the last Sunday of October. Standard time is UTC+2,
 * summer time UTC+3.
 *
 * Used by scripts/calendar-sync.mjs to write every window bound — where it is ALSO asserted
 * against the platform's tz database, so a change in the law fails the generator loudly — and by
 * scripts/check-campaigns.mjs to catch an authored bound typed with the wrong season's offset
 * (`+03:00` on a March date is a valid instant, one hour away from the one that was meant).
 *
 * Pure: no clock, no network, no Intl.
 */

/** Day of the month of the last Sunday of `month` (1-based) in `year`. */
function lastSunday(year, month) {
  const d = new Date(Date.UTC(year, month, 0)); // day 0 of the next month = last day of `month`
  return d.getUTCDate() - d.getUTCDay();
}

/** Is Israel on summer time at this wall-clock date and hour? */
export function isIsraelDst(y, m, d, hh) {
  const start = lastSunday(y, 3) - 2; // the Friday before the last Sunday of March
  const end = lastSunday(y, 10);
  const key = m * 10_000 + d * 100 + hh;
  return key >= 3 * 10_000 + start * 100 + 2 && key < 10 * 10_000 + end * 100 + 2;
}

/** "+03:00" or "+02:00" for an Israel wall-clock date ("YYYY-MM-DD") and hour. */
export function israelOffset(date, hh) {
  const [y, m, d] = date.split("-").map(Number);
  return isIsraelDst(y, m, d, hh) ? "+03:00" : "+02:00";
}
