import type { AxiosInstance } from 'axios';
import type LocalStorage from '@/helpers/LocalStorage';
import type { Composer } from 'vue-i18n';

declare module 'vue' {
    interface ComponentCustomProperties {
        $axios: AxiosInstance;
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        $t: (key: string, ...args: any[]) => string;
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        $tc: (key: string, choice?: number, ...args: any[]) => string;
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        $tm: (key: string, ...args: any[]) => string;
        $ls: LocalStorage;
        $refs: {
            //eslint-disable-next-line @typescript-eslint/no-explicit-any
            [key: string]: HTMLElement | any;
        };
    }
}


declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $axios: AxiosInstance;
        $t: Composer['t'];
        $tc: Composer['tc'];
        $tm: Composer['tm'];
        $i18n: Composer;
        $ls: LocalStorage;
    }
}