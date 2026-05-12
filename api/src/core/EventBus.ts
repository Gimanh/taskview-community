import { EventEmitter } from 'node:events';
import type { TasksSchemaTypeForSelect } from 'taskview-db-schemas';
import type { TimeEntryWithUser } from '../tv-modules/time-tracking/types';
import { $logger } from '../modules/logget';

export interface AppEvents {
    'task.created': { task: TasksSchemaTypeForSelect; initiatorId: number };
    'task.updated': { task: TasksSchemaTypeForSelect; changes: Record<string, unknown>; initiatorId: number };
    'task.assigneesChanged': { taskId: number; userIds: number[]; initiatorId: number };
    'task.deleted': { taskId: number; goalId: number; initiatorId: number };
    'collaboration.userAdded': { goalId: number; email: string; initiatorId: number };
    'collaboration.userRemoved': { goalId: number; collaborationUserId: number; initiatorId: number };
    'collaboration.rolesChanged': { goalId: number; collaborationUserId: number; initiatorId: number };
    'time-entry.started': { entry: TimeEntryWithUser; taskId: number; userId: number; goalId: number };
    'time-entry.stopped': { entry: TimeEntryWithUser; taskId: number; userId: number; goalId: number; durationSeconds: number };
    'time-entry.created': { entry: TimeEntryWithUser; initiatorId: number };
    'time-entry.updated': { entry: TimeEntryWithUser; changes: Record<string, unknown>; initiatorId: number };
    'time-entry.deleted': { entryId: number; taskId: number; goalId: number; userId: number; initiatorId: number };
}

type EventName = keyof AppEvents;
type EventHandler<T extends EventName> = (data: AppEvents[T]) => void | Promise<void>;

class AppEventBus {
    private emitter = new EventEmitter();

    on<T extends EventName>(event: T, handler: EventHandler<T>) {
        this.emitter.on(event, (data: AppEvents[T]) => {
            try {
                const result = handler(data);
                if (result instanceof Promise) {
                    result.catch((err) => {
                        $logger.error(err, `EventBus handler error [${event}]`);
                    });
                }
            } catch (err) {
                $logger.error(err, `EventBus handler error [${event}]`);
            }
        });
    }

    emit<T extends EventName>(event: T, data: AppEvents[T]) {
        this.emitter.emit(event, data);
    }
}

export const eventBus = new AppEventBus();
