import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CalendarTimeRange } from '@/types/calendar.types'
import type { CalendarTimeText } from './useCalendarTimeText.types'

function dayPeriod(parts: Intl.DateTimeFormatPart[]) {
  return parts.find((part) => part.type === 'dayPeriod')?.value
}

/** The one place a calendar task's time becomes text, so every view and card shows it the same way. */
export function useCalendarTimeText() {
  const { locale } = useI18n()
  const timeFormat = computed(() => new Intl.DateTimeFormat(locale.value, { hour: 'numeric', minute: '2-digit' }))

  function timeText(range: CalendarTimeRange): CalendarTimeText {
    const start = timeFormat.value.format(range.start)
    if (!range.end) return { start, range: start }

    const end = timeFormat.value.format(range.end)
    const startParts = timeFormat.value.formatToParts(range.start)
    // "8:55–11:50 AM", not "8:55 AM–11:50 AM": the start keeps its AM/PM only when the end has a different one
    const sharedDayPeriod = dayPeriod(startParts) && dayPeriod(startParts) === dayPeriod(timeFormat.value.formatToParts(range.end))
    const rangeStart = sharedDayPeriod
      ? startParts
        .filter((part) => part.type === 'hour' || part.type === 'minute' || (part.type === 'literal' && part.value.trim()))
        .map((part) => part.value)
        .join('')
      : start
    return { start, range: `${rangeStart}–${end}` }
  }

  return { timeText }
}
