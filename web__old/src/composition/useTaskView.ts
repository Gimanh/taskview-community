import { type ComputedRef, computed } from 'vue';
import { useMobile } from './useMobile';
import {
    ROUTE_LOCATION_KANBAN,
    ROUTE_LOCATION_LISTS,
    ROUTE_LOCATION_TASKS,
    useRouteLocation,
} from './useRouteLocation';

let cachedTaskView:
    | {
          isMobile: ReturnType<typeof useMobile>['isMobile'];
          routeName: ReturnType<typeof useRouteLocation>;
          showProjectHelpers: ComputedRef<boolean>;
      }
    | undefined;

export const useTaskView = () => {
    if (!cachedTaskView) {
        const isMobile = useMobile();
        const routeState = useRouteLocation();

        cachedTaskView = {
            isMobile: isMobile.isMobile,
            routeName: routeState,
            showProjectHelpers: computed(() =>
                [ROUTE_LOCATION_TASKS, ROUTE_LOCATION_LISTS, ROUTE_LOCATION_KANBAN].includes(routeState.value)
            ),
        };
    }
    return cachedTaskView;
};
