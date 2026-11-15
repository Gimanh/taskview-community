export type CalendarTimeText = {
  // "8:55 AM": for a card with no room for the whole range
  start: string
  // "8:55–11:50 AM", or the start alone when the event has no end
  range: string
}
