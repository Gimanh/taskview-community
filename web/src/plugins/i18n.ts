import { createI18n } from 'vue-i18n'
import { messages, defaultLocale, locales, type Locale } from '@/locales'

export const LOCALE_STORAGE_KEY = 'locale'

export const i18n = createI18n({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: 'en',
  messages,
})

export async function restoreSavedLocale() {
  const { $ls } = await import('@/plugins/axios')
  const value = await $ls.getValue(LOCALE_STORAGE_KEY)
  if (value && locales.includes(value as Locale)) {
    i18n.global.locale.value = value as Locale
  }
}

export async function saveLocale(locale: Locale) {
  const { $ls } = await import('@/plugins/axios')
  await $ls.setValue(LOCALE_STORAGE_KEY, locale)
  i18n.global.locale.value = locale
}

export function useI18n() {
  return i18n.global
}
