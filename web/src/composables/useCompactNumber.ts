import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CompactRatioArgs } from './useCompactNumber.types'

const COMPACT_FROM = 1_000
// Where the language's own short form is too long for a tight place, a shorter one written right after the number
const SHORT_UNITS: Record<string, Record<string, string>> = {
  ru: { 'тыс.': 'К' },
}

// Counts shown in tight places: exact while short, "1.7K" from a thousand on
export function useCompactNumber() {
  const { locale } = useI18n()
  const format = computed(() => new Intl.NumberFormat(locale.value, { notation: 'compact' }))

  function shorten(value: number): string {
    const units = SHORT_UNITS[locale.value.slice(0, 2)]
    const parts = format.value.formatToParts(value)
    const unitIndex = parts.findIndex((part) => part.type === 'compact' && units?.[part.value])
    if (unitIndex < 0) return parts.map((part) => part.value).join('')
    return parts
      .filter((part, index) => !(part.type === 'literal' && index === unitIndex - 1))
      .map((part, index, kept) => (kept[index].type === 'compact' ? units[part.value] : part.value))
      .join('')
  }

  function compactNumber(value: number): string {
    return value < COMPACT_FROM ? String(value) : shorten(value)
  }

  // "2K / 12K": once the whole is shortened, the part is too, so both read the same way
  function compactRatio({ part, whole }: CompactRatioArgs): string {
    if (whole < COMPACT_FROM) return `${part} / ${whole}`
    return `${compactNumber(part)} / ${compactNumber(whole)}`
  }

  return { compactNumber, compactRatio }
}
