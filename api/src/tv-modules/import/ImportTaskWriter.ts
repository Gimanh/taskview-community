import { TasksRepository } from '../tasks/TasksRepository';
import type { ImportTask } from './core/import-provider.types';
import { ImportRepository } from './ImportRepository';
import type { ImportPendingAttachment, ImportRepoTaskRow, ImportTaskWriterArgs } from './types';

export class ImportTaskWriter {
    private readonly repository = new ImportRepository();
    private readonly args: ImportTaskWriterArgs;
    private readonly taskIds = new Map<string, number>();
    private readonly kanbanCounters = new Map<number | null, number>();

    constructor(args: ImportTaskWriterArgs) {
        this.args = args;
    }

    async write(batch: ImportTask[]): Promise<ImportPendingAttachment[]> {
        const pending: ImportPendingAttachment[] = [];
        let remaining = batch.filter((task) => !this.taskIds.has(task.externalId));

        while (remaining.length > 0) {
            let ready = remaining.filter((task) => !task.parentExternalId || this.taskIds.has(task.parentExternalId));
            if (ready.length === 0) {
                for (const task of remaining) {
                    this.args.report.warn({ code: 'parent_missing', subject: task.title });
                }
                ready = remaining.map((task) => ({ ...task, parentExternalId: null }));
            }

            const ids = await this.repository.insertTasks(ready.map((task) => this.toRow(task)));
            for (const [index, task] of ready.entries()) this.taskIds.set(task.externalId, ids[index]);
            this.args.report.stats.tasksCreated += ids.length;

            await this.writeLinks(ready);
            for (const task of ready) {
                const taskId = this.taskIds.get(task.externalId)!;
                for (const attachment of task.attachments) pending.push({ taskId, attachment });
            }

            const insertedIds = new Set(ready.map((task) => task.externalId));
            remaining = remaining.filter((task) => !insertedIds.has(task.externalId));
        }

        return pending;
    }

    private async writeLinks(tasks: ImportTask[]): Promise<void> {
        const tagRows = tasks.flatMap((task) => {
            const taskId = this.taskIds.get(task.externalId)!;
            const tagIds = new Set(task.tagExternalIds.map((id) => this.args.tagIds.get(id)).filter((id) => id !== undefined));
            return [...tagIds].map((tagId) => ({ taskId, tagId }));
        });
        await this.repository.insertTaskTags(tagRows);

        const assigneeRows = tasks.flatMap((task) => {
            const taskId = this.taskIds.get(task.externalId)!;
            const collabIds = new Set(
                task.assigneeExternalIds.map((id) => this.args.assigneeIds.get(id)).filter((id) => id !== undefined),
            );
            return [...collabIds].map((collabUserId) => ({ taskId, collabUserId }));
        });
        await this.repository.insertAssignees(assigneeRows);
        this.args.report.stats.assigneesLinked += assigneeRows.length;
    }

    private toRow(task: ImportTask): ImportRepoTaskRow {
        const statusId = task.statusExternalId ? this.args.statusIds.get(task.statusExternalId) ?? null : null;
        return {
            goalId: this.args.goalId,
            parentId: task.parentExternalId ? this.taskIds.get(task.parentExternalId) ?? null : null,
            description: task.title,
            note: task.noteMarkdown,
            sourceUrl: task.sourceUrl,
            statusId,
            goalListId: task.listExternalId ? this.args.listIds.get(task.listExternalId) ?? null : null,
            startDate: task.startDate,
            endDate: task.endDate,
            priorityId: task.priority,
            complete: task.complete,
            dateComplete: task.complete ? task.completedAt ?? new Date() : null,
            kanbanOrder: this.nextKanbanOrder(statusId),
            creatorId: this.args.creatorId,
        };
    }

    private nextKanbanOrder(statusId: number | null): number {
        const next = (this.kanbanCounters.get(statusId) ?? 0) + TasksRepository.KANBAN_ORDER_GAP;
        this.kanbanCounters.set(statusId, next);
        return next;
    }
}
