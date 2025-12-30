import { defineStore } from 'pinia';
import type { AppStoreState } from '@/types/global-app.types';

export const useAppStore = defineStore('app', {
    state(): AppStoreState {
        return {
            drawer: false,
        };
    },
    actions: {
        setDrawer(state: boolean) {
            this.drawer = state;
        },
    },
});
