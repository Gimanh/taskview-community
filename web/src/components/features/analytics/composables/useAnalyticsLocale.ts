import { useI18n } from 'vue-i18n'
import type { LocalizedText } from 'taskview-api'

export function useAnalyticsLocale() {
  const { locale } = useI18n()

  function pick(text: LocalizedText | undefined): string {
    if (!text) return ''
    const loc = locale.value as keyof LocalizedText
    return text[loc] ?? text.en ?? text.ru ?? ''
  }

  return { pick }
}
