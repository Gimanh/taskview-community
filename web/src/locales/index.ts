import de from './de'
import en from './en'
import ru from './ru'

export const messages = {
  en,
  ru,
  de,
}

export type Locale = keyof typeof messages
export const locales: Locale[] = ['en', 'ru', 'de']
export const defaultLocale: Locale = 'en'
