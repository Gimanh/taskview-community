import { startJobQueue } from './JobQueue';
import type { Dispatcher } from './Dispatcher';
import { NotificationDispatcher } from '../tv-modules/notifications/NotificationDispatcher';
import { RealtimeDispatcher } from '../tv-modules/realtime/RealtimeDispatcher';
import { WebhooksDispatcher } from '../tv-modules/webhooks/WebhooksDispatcher';
import { TimeTrackingDispatcher } from '../tv-modules/time-tracking/TimeTrackingDispatcher';
import { SprintsDispatcher } from '../tv-modules/sprints/SprintsDispatcher';
import { RecurrenceDispatcher } from '../tv-modules/recurrence/RecurrenceDispatcher';

const dispatchers: Dispatcher[] = [
    new NotificationDispatcher(),
    new RealtimeDispatcher(),
    new WebhooksDispatcher(),
    new TimeTrackingDispatcher(),
    new SprintsDispatcher(),
    new RecurrenceDispatcher(),
];

export function registerAllEventHandlers() {
    dispatchers.forEach((d) => d.register());
}

export async function startAllWorkers() {
    await startJobQueue();
    for (const d of dispatchers) {
        await d.registerWorkers();
    }
}
