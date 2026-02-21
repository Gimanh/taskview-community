import { createI18n } from 'vue-i18n';
import en from '@/lang/en.json';
import ru from '@/lang/ru.json';
import type { TI18nLocalesInApp } from '@/types/app.types';

const messages: TI18nLocalesInApp = {
    en: en,
    ru: ru,
};
const i18n = createI18n({
    locale: 'ru',
    fallbackLocale: 'en',
    missingWarn: false, // Отключает предупреждения о пропущенных ключах
    fallbackWarn: false, // Отключает предупреждения о fallback
    messages,
    legacy: false,
});
export default i18n;
const $i18n = i18n.global;
export { $i18n };
