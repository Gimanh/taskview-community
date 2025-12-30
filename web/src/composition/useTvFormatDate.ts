import { useDateFormat } from '@vueuse/core';
import { computed, ref, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';

type TvLocaleSupport = 'en' | 'ru';

export type TvFormatDateOptions = {
    showTime?: boolean;
    showDayName?: boolean;
    format?: 'relative' | 'short' | 'full';
    locale?: 'en' | 'ru';
};

export function useTvFormatDate(
    date: Date | string | null | undefined,
    options: TvFormatDateOptions = {},
    i18n?: ReturnType<typeof useI18n>
) {
    const { t, locale } = i18n || useI18n();
    const translate = t as (key: string) => string;
    const { showTime = false, showDayName = false, format = 'relative', locale: forcedLocale } = options;

    const currentLocale = forcedLocale || (locale.value as TvLocaleSupport);

    return computed(() => {
        if (!date) return '';

        const targetDate = new Date(date);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        // Сбрасываем время для корректного сравнения дат
        const targetDateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
        const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

        const weekDays = ref(
            getShortDayName(targetDate, currentLocale).charAt(0).toUpperCase() +
                getShortDayName(targetDate, currentLocale).slice(1)
        );

        watchEffect(() => {
            weekDays.value =
                getShortDayName(targetDate, locale.value as TvLocaleSupport)
                    .charAt(0)
                    .toUpperCase() + getShortDayName(targetDate, locale.value as TvLocaleSupport).slice(1);
        });

        // Относительные даты
        if (format === 'relative') {
            if (targetDateOnly.getTime() === todayOnly.getTime()) {
                return translate('msg.today');
            }
            if (targetDateOnly.getTime() === tomorrowOnly.getTime()) {
                return translate('msg.tomorrow');
            }
            if (targetDateOnly.getTime() === yesterdayOnly.getTime()) {
                return translate('msg.yesterday');
            }

            // Для дат в пределах недели
            const diffTime = targetDateOnly.getTime() - todayOnly.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 0 && diffDays <= 7) {
                return currentLocale === 'ru'
                    ? `${translate('msg.dateIn')} ${diffDays} ${getDayWord(diffDays, currentLocale, translate)}`
                    : `${translate('msg.dateIn')} ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
            }

            if (diffDays < 0 && diffDays >= -7) {
                const absDays = Math.abs(diffDays);
                return currentLocale === 'ru'
                    ? `${absDays} ${getDayWord(absDays, currentLocale, translate)} ${translate('msg.dateAgo')}`
                    : `${absDays} ${absDays === 1 ? 'day' : 'days'} ${translate('msg.dateAgo')}`;
            }
        }

        // Абсолютные даты
        const year = targetDate.getFullYear();
        const currentYear = today.getFullYear();

        if (format === 'short') {
            // Краткий формат: DD.MM или DD.MM.YYYY
            if (year === currentYear) {
                const shortDate = useDateFormat(targetDate, 'DD.MM').value;
                return showDayName ? `${shortDate} ${weekDays.value}` : shortDate;
            } else {
                return useDateFormat(targetDate, 'DD.MM.YYYY').value;
            }
        }

        if (format === 'full') {
            // Полный формат с названием месяца
            const fullDate =
                currentLocale === 'ru'
                    ? useDateFormat(targetDate, 'DD MMMM YYYY').value
                    : useDateFormat(targetDate, 'MMMM DD, YYYY').value;

            return showTime ? `${fullDate} ${useDateFormat(targetDate, 'HH:mm').value}` : fullDate;
        }

        // По умолчанию используем краткий формат
        const shortDate =
            year === currentYear
                ? useDateFormat(targetDate, 'DD.MM').value
                : useDateFormat(targetDate, 'DD.MM.YYYY').value;

        return showDayName ? `${shortDate} ${weekDays.value}` : shortDate;
    });
}

// Вспомогательные функции с использованием встроенных возможностей
function getShortDayName(date: Date, locale: TvLocaleSupport): string {
    // Используем Intl.DateTimeFormat для правильного порядка дней недели
    const formatter = new Intl.DateTimeFormat(locale, {
        weekday: 'short',
    });
    return formatter.format(date);
}

function getDayWord(days: number, locale: TvLocaleSupport, translate: (key: string) => string): string {
    if (locale === 'ru') {
        if (days === 1) return translate('msg.day');
        if (days >= 2 && days <= 4) return translate('msg.days1');
        return translate('msg.days');
    }
    return days === 1 ? 'day' : 'days';
}
