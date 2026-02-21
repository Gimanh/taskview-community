import { createI18n } from 'vue-i18n'
import { messages, defaultLocale } from '@/locales'

export const i18n = createI18n({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: 'en',
  messages,
})

export function useI18n() {
  return i18n.global
}
