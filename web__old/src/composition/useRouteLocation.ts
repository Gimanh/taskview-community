import { computed } from 'vue';
import router from '@/router';

export const ROUTE_LOCATION_TASKS = 'tasks';
export const ROUTE_LOCATION_LISTS = 'lists';
export const ROUTE_LOCATION_USER = 'user';
export const ROUTE_LOCATION_OTHER = 'other';
export const ROUTE_LOCATION_KANBAN = 'kanban';

export function useRouteLocation() {
    return computed<'tasks' | 'lists' | 'other' | 'user' | typeof ROUTE_LOCATION_KANBAN>(() => {
        switch (router.currentRoute.value.name) {
            case ROUTE_LOCATION_KANBAN:
                return ROUTE_LOCATION_KANBAN;
            case 'goal-list-tasks':
                return ROUTE_LOCATION_TASKS;
            case 'goal-lists':
                return ROUTE_LOCATION_LISTS;
            case 'user':
                return ROUTE_LOCATION_USER;
            default:
                return ROUTE_LOCATION_OTHER;
        }
    });
}
