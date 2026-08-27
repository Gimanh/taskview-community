import de from './de'
import en from './en'
import es from './es'
import ptBr from './pt-br'
import ru from './ru'

export const messages = {
  en,
  ru,
  de,
  es,
  'pt-BR': ptBr,
}

export type Locale = keyof typeof messages
export const locales: Locale[] = ['en', 'ru', 'de', 'es', 'pt-BR']
export const defaultLocale: Locale = 'en'
