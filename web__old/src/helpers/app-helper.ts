import {
    mdiAccountBoxMultipleOutline,
    mdiArchiveArrowDownOutline,
    mdiArchiveArrowUpOutline,
    mdiArchiveOutline,
    mdiCancel,
    mdiCardsOutline,
    mdiChartTimelineVariantShimmer,
    mdiCheckboxMarkedCircleAutoOutline,
    mdiCurrencyUsd,
    mdiDeleteOutline,
    mdiGraphOutline,
    mdiHomeOutline,
    mdiLightbulbOn10,
    mdiListBoxOutline,
    mdiPencilOutline,
    mdiPlus,
    mdiShieldLockOpenOutline,
} from '@mdi/js';
import type { GoalItem } from 'taskview-api';
import { computed } from 'vue';
import type { Router } from 'vue-router';
import { useUserStore } from '@/stores/user.store';
import { ALL_TASKS_LIST_ID } from '@/types/tasks.types';

export const SORT_DEFAULT = 0;
export const SORT_ASC = 1;
export const SORT_DESC = 2;

export const isLoggedIn = computed(() => {
    const userStore: ReturnType<typeof useUserStore> = useUserStore();
    return userStore.isLoggedIn;
});

export const goToLoginPage = async (router: Router) => {
    await router.push({ name: 'login' });
};

export const redirectToUser = async (router: Router) => {
    const userStore: ReturnType<typeof useUserStore> = useUserStore();
    if (userStore.accessToken) {
        await router.push({ name: 'user', params: { user: userStore.login } });
    }
};

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logError = (err: any) => console.log(err);

export function getDateFormatFOrSafari(date: string): string {
    return date.substr(0, 10).replace(/-/g, '/');
}

//eslint-disable-next-line @typescript-eslint/no-explicit-any
type DebouncedFunction<T extends (...args: any[]) => any> = {
    (...args: Parameters<T>): void;
    cancel: () => boolean;
};

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => ReturnType<T>>(fn: T, delay: number): DebouncedFunction<T> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const debounced = (...args: Parameters<T>): void => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            fn(...args);
            timeoutId = null;
        }, delay);
    };

    debounced.cancel = () => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
            return true;
        }
        return false;
    };

    return debounced;
}

export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), ms);
    });
}

/**
 * @deprecated
 * @param date
 * @param defaultText
 * @param addTz
 * @param delimiter
 * @param forDb
 * @param addYear
 * @returns
 */
export function formatDate(
    date: Date,
    defaultText: string,
    addTz = false,
    delimiter = '.',
    forDb = false,
    addYear = true
) {
    const now = new Date(date);
    if (now) {
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0'); // Месяцы начинаются с 0
        const year = now.getFullYear();

        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');

        let tz = '';
        if (addTz) {
            const timezoneOffsetInMinutes = date.getTimezoneOffset();
            const offsetHours = Math.floor(Math.abs(timezoneOffsetInMinutes) / 60);
            const offsetMinutes = Math.abs(timezoneOffsetInMinutes) % 60;
            const offsetSign = timezoneOffsetInMinutes <= 0 ? '+' : '-';
            const formattedOffset = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(
                offsetMinutes
            ).padStart(2, '0')}`;

            tz = `:00${formattedOffset}`;
        }
        if (forDb) {
            return `${year}${delimiter}${month}${delimiter}${day} ${hours}:${minutes}${tz}`;
        }
        return `${day}${delimiter}${month}${addYear ? delimiter : ''}${addYear ? year : ''} ${hours}:${minutes}${tz}`;
    }
    return defaultText;
}

export function getTimeZone() {
    const date = new Date();
    const timezoneOffsetInMinutes = date.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(timezoneOffsetInMinutes) / 60);
    const offsetMinutes = Math.abs(timezoneOffsetInMinutes) % 60;
    const offsetSign = timezoneOffsetInMinutes <= 0 ? '+' : '-';
    const formattedOffset = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(
        2,
        '0'
    )}`;

    return `${formattedOffset}`;
}

//FIXME use library or vueUse
export function formatToUiDate(date: Date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();

    return `${monthName} ${day} ${dayName}`;
}
/**
 * @deprecated
 * @param date
 */
export function formatToMonthAdnDayDate(date: Date) {
    // const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();

    return `${monthName} ${day}`;
}

export function getPasteleColor() {
    return `hsl(${360 * Math.random()},${65 + 70 * Math.random()}%,${65 + 10 * Math.random()}%)`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => ReturnType<T> | undefined {
    let canCall = true;
    return (...args: Parameters<T>): ReturnType<T> | undefined => {
        if (canCall) {
            canCall = false;
            setTimeout(() => {
                canCall = true;
            }, delay);
            return func(...args);
        }
    };
}

export const isNotNullable = <T>(val: T): val is Exclude<T, null | undefined> => {
    return val !== null && val !== undefined;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function convertValuesToString<T extends Record<string, any>>(obj: T): Record<keyof T, string> {
    return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, String(value)])) as Record<
        keyof T,
        string
    >;
}

export const APP_ICONS = {
    collaboration: mdiShieldLockOpenOutline,
    kanban: mdiCardsOutline,
    noItems: mdiCancel,
    edit: mdiPencilOutline,
    delete: mdiDeleteOutline,
    archive: mdiArchiveArrowDownOutline,
    unArchive: mdiArchiveArrowUpOutline,
    dashboard: mdiHomeOutline,
    projects: mdiLightbulbOn10,
    users: mdiAccountBoxMultipleOutline,
    analytics: mdiChartTimelineVariantShimmer,
    archiveState: mdiArchiveOutline,
    lists: mdiListBoxOutline,
    tasks: mdiCheckboxMarkedCircleAutoOutline,
    add: mdiPlus,
    money: mdiCurrencyUsd,
    graph: mdiGraphOutline,
};

export const COLOR_TV_MAIN = '#8e71ff';

export const APP_ROUTES = {
    goalList: (goalId: GoalItem['id'], listId = ALL_TASKS_LIST_ID) => ({
        name: 'goal-list-tasks',
        params: { goalId, listId },
    }),
};
