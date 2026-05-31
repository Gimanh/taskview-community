/** Returns a YYYY-MM-DD date string offset by `offsetDays` from today (UTC). */
export function ymd(offsetDays = 0): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}
