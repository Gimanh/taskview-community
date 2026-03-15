import { startJobQueue } from './JobQueue';
import { registerNotificationEventHandlers, registerNotificationWorkers } from '../tv-modules/notifications/notifications.events';

/**
 * Register all event handlers (called on app init, before JobQueue starts)
 */
export function registerAllEventHandlers() {
    registerNotificationEventHandlers();
}

/**
 * Start JobQueue and register all job workers
 */
export async function startAllWorkers() {
    await startJobQueue();
    await registerNotificationWorkers();
}
