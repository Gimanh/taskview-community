import { chunk } from '../../utils/helpers';
import type { AppUser } from '../../core/AppUser';
import type { TaskForClientNew } from '../tasks/tasks.server.types';
import { KanbanRepository } from './KanbanRepository';
import {
    type DeleteKanbanStatus,
    type KanbanAddStatus,
    type KanbanArgFetchTasksForColumn,
    type KanbanArgGetTasksOrderForColumnAndCursor,
    type KanbanArgUpdateTasksOrder,
    type KanbanStatusForClient,
    KanbanStatusToClientSchema,
    type UpdateKanbanStatus,
} from './types';

export class KanbanManager {
    protected readonly user: AppUser;
    public readonly repository: KanbanRepository;

    constructor(appUser: AppUser) {
        this.user = appUser;
        this.repository = new KanbanRepository();
    }

    async getAllStatusesForGoal(goalId: number): Promise<KanbanStatusForClient[]> {
        const statuses = await this.repository.getAllStatusesForGoal(goalId);
        return statuses.map((stat) => KanbanStatusToClientSchema.parse(stat));
    }

    async updateStatus(data: UpdateKanbanStatus) {
        return await this.repository.updateNameFotStatus(data.id, data.name, data.viewOrder);
    }

    async deleteStatus(data: DeleteKanbanStatus) {
        return await this.repository.deleteStatus(data.id);
    }

    async addStatus(data: KanbanAddStatus): Promise<KanbanStatusForClient | null> {
        const status = await this.repository.addStatus(data.name, data.goalId);
        if (!status) {
            return null;
        }

        return KanbanStatusToClientSchema.parse(status);
    }

    async fetchTasksForColumn(data: KanbanArgFetchTasksForColumn): Promise<{ tasks: TaskForClientNew[], nextCursor: string | number | null, columnVersion: number | null }> {
        const [tasks, columnVersion] = await Promise.all([
            this.user.tasksManager.fetchTasksForKanbanColumn(data),
            this.repository.getColumnVersion(data.goalId, data.columnId)
        ]);
        return { tasks: tasks.tasks, nextCursor: tasks.nextCursor, columnVersion };
    }

    async getTasksOrderForColumnAndCursor(data: KanbanArgGetTasksOrderForColumnAndCursor): Promise<{ tasks: ({ id: number, kanbanOrder: number | null }[]) | null, columnVersion: number | null }> {
        return {
            tasks: await this.repository.getTasksOrderForColumnAndCursor(data.goalId, data.columnId, data.cursor),
            columnVersion: await this.repository.getColumnVersion(data.goalId, data.columnId)
        };
    }

    async rebalanceTasksOrder(data: KanbanArgUpdateTasksOrder): Promise<{ id: number, kanbanOrder: number | null }[]> {
        const tasks = await this.repository.getTasksOrderForColumnAndCursor(data.goalId, data.columnId, null);
        const KANBAN_GAP = 16384;

        if (!tasks || tasks.length === 0) {
            return [];
        }

        let maxOrder: number = 0;

        tasks.forEach((task) => {
            task.kanbanOrder && (maxOrder = Math.max(maxOrder, task.kanbanOrder));
        });

        const tasksWithNewOrder = tasks.map((task, index) => {
            return {
                id: task.id,
                kanbanOrder: maxOrder + KANBAN_GAP * (index + 1),
            }
        });

        const chunks = chunk(tasksWithNewOrder, 200);

        for (const chunk of chunks) {
            await this.repository.updateTasksOrder(chunk);
        }

        await this.repository.updateColumnVersion(data.goalId, data.columnId);

        return tasksWithNewOrder;
    }

    async updateTasksOrderAndColumn(data: KanbanArgUpdateTasksOrder): Promise<{ tasks: { id: number, kanbanOrder: number | null }[], columnVersion: number | null }> {
        const KANBAN_GAP = 16384;
        const MIN_GAP_THRESHOLD = 1e-6;

        // Получаем порядки предыдущей и следующей задач
        let prevTask = data.prevTaskId
            ? (await this.repository.getTaskById(data.prevTaskId))?.kanbanOrder ?? null
            : null;
        let nextTask = data.nextTaskId
            ? (await this.repository.getTaskById(data.nextTaskId))?.kanbanOrder ?? null
            : null;

        let newOrder: number | null = null;

        const getNewOrderAndRebalanceIfNeeded = async (aPrevTask: number, aNextTask: number) => {
            const mid = (aPrevTask + aNextTask) / 2;

            if (
                mid === aPrevTask ||
                mid === aNextTask ||
                (aNextTask - aPrevTask < MIN_GAP_THRESHOLD)
            ) {
                const rebalanced = await this.rebalanceTasksOrder(data);

                const updatedPrev = rebalanced.find(t => t.id === data.prevTaskId)?.kanbanOrder ?? null;
                const updatedNext = rebalanced.find(t => t.id === data.nextTaskId)?.kanbanOrder ?? null;

                if (updatedPrev === null || updatedNext === null) {
                    return null;
                }

                if (updatedPrev >= updatedNext) {
                    return null;
                }

                return (updatedPrev + updatedNext) / 2;
            }

            return mid;
        };

        if (prevTask !== null && nextTask !== null && prevTask >= nextTask) {
            newOrder = await getNewOrderAndRebalanceIfNeeded(prevTask, nextTask);
        }

        if (prevTask !== null && nextTask !== null) {
            // вставка между
            newOrder = await getNewOrderAndRebalanceIfNeeded(prevTask, nextTask);
        } else if (prevTask !== null) {
            // вставка после prev — ищем реального следующего
            const localNextTask = await this.repository.getNextTaskByKanbanOrder({
                goalId: data.goalId,
                columnId: data.columnId,
                kanbanOrder: prevTask,
            });

            if (localNextTask && localNextTask?.kanbanOrder != null) {
                newOrder = await getNewOrderAndRebalanceIfNeeded(prevTask, localNextTask.kanbanOrder);
            } else {
                newOrder = prevTask + KANBAN_GAP;
            }
        } else if (nextTask !== null) {
            // если есть задача перед следующей, то используем её порядок вдруг добавил другой пользователь
            const localPreviousTask = await this.repository.getPreviousTaskByKanbanOrder({
                goalId: data.goalId,
                columnId: data.columnId,
                kanbanOrder: nextTask,
            });

            if (localPreviousTask && localPreviousTask?.kanbanOrder != null) {
                newOrder = await getNewOrderAndRebalanceIfNeeded(localPreviousTask.kanbanOrder, nextTask);
            } else {
                if ((nextTask / 2) < 2) {
                    const rebalanced = await this.rebalanceTasksOrder(data);
                    const updatedNextTask = rebalanced.find(t => t.id === data.nextTaskId)?.kanbanOrder ?? null;
                    if (updatedNextTask !== null) {
                        newOrder = updatedNextTask / 2;
                    } else {
                        newOrder = KANBAN_GAP / 2;
                    }
                } else {
                    newOrder = nextTask / 2;
                }
            }
        } else {
            // первая задача в колонке
            newOrder = KANBAN_GAP;
        }

        if (newOrder !== null) {
            await this.user.tasksManager.repository.updateTask({
                id: data.taskId,
                kanbanOrder: newOrder,
                statusId: data.columnId,
            });
        }

        const result = await this.repository.getTasksOrderForColumnAndCursor(
            data.goalId,
            data.columnId,
            null
        );

        return {
            tasks: result ?? [],
            columnVersion: await this.repository.getColumnVersion(data.goalId, data.columnId)
        };
    }
}
