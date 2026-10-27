import { TaskFieldPermissionsForWatching } from './tasks.server.types';
import type { HideUnwatchableTaskFieldsArgs, TaskWatchableField } from './tasks.server.types';

/** Nulls every task field the checker does not allow to watch; mutates and returns the task. */
export function hideUnwatchableTaskFields<T extends object>(args: HideUnwatchableTaskFieldsArgs<T>): T {
    const task = args.task as Record<TaskWatchableField, unknown>;
    (Object.keys(TaskFieldPermissionsForWatching) as TaskWatchableField[]).forEach((key) => {
        if (!args.checker.hasPermissions(TaskFieldPermissionsForWatching[key])) {
            task[key] = null;
        }
    });
    return args.task;
}
