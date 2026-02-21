import type { MiddlewareHandlers } from '@/router';

import 'vue-router';

declare module 'vue-router' {
    interface RouteMeta {
        middleware?: MiddlewareHandlers;
    }
}
