import de from './de'
import en from './en'
import es from './es'
import ru from './ru'

export const messages = {
  en,
  ru,
  de,
  es,
}

export type Locale = keyof typeof messages
export const locales: Locale[] = ['en', 'ru', 'de', 'es']
export const defaultLocale: Locale = 'en'
