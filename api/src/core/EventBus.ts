import { EventEmitter } from 'node:events';
import type { TasksSchemaTypeForSelect } from 'taskview-db-schemas';
import { $logger } from '../modules/logget';

export interface AppEvents {
    'task.created': { task: TasksSchemaTypeForSelect; userId: number };
    'task.updated': { task: TasksSchemaTypeForSelect; changes: Record<string, unknown>; userId: number };
    'task.deleted': { taskId: number; goalId: number };
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
