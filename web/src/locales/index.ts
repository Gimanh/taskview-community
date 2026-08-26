import de from './de'
import en from './en'
import es from './es'
import ru from './ru'
import ptBR from './ptBR'

export const messages = {
  en,
  ru,
  de,
  es,
  ptBR
}

export type Locale = keyof typeof messages
export const locales: Locale[] = ['en', 'ru', 'de', 'es', 'ptBR']
export const defaultLocale: Locale = 'en'
