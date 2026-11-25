import { GoalPermissions } from '../../types/auth.types';
import type { FileQuotaResolver } from '../files/FileQuotaResolver';
import type { FileStorageFactory } from '../files/storage/FileStorageFactory';
import type { TaskMoveRepository } from './TaskMoveRepository';
import { TaskNoteFileRefs } from './TaskNoteFileRefs';
import type { TaskMoveNoteFilesPlan, TaskNoteFile, TaskNoteFilesPlanArgs, TaskNoteFilesPlannerArgs } from './task-move.types';

export class TaskNoteFilesPlanner {
    private readonly repository: TaskMoveRepository;
    private readonly quotas: FileQuotaResolver;
    private readonly storages: FileStorageFactory;

    constructor(args: TaskNoteFilesPlannerArgs) {
        this.repository = args.repository;
        this.quotas = args.quotas;
        this.storages = args.storages;
    }

    async plan(args: TaskNoteFilesPlanArgs): Promise<TaskMoveNoteFilesPlan> {
        const plan: TaskMoveNoteFilesPlan = { moveIds: [], copyIds: [], leftIds: [] };

        const notes = await this.repository.fetchNotes(args.taskIds);
        const referenced = [...new Set(notes.flatMap((task) => TaskNoteFileRefs.extract(task.note)))];
        if (referenced.length === 0) return plan;

        // A note can name any id: only files of the source project are ever touched
        const files = await this.repository.fetchFilesInGoal({ fileIds: referenced, goalId: args.sourceGoalId });
        if (files.length === 0) return plan;

        const canTake =
            args.source.hasPermissions(GoalPermissions.FILE_CAN_VIEW) && args.destination.hasPermissions(GoalPermissions.FILE_CAN_MANAGE);
        if (!canTake) return { ...plan, leftIds: files.map((file) => file.id) };

        // Taking a file out of the source project is the same right as deleting it there
        const canMove = args.mode === 'move' && args.source.hasPermissions(GoalPermissions.FILE_CAN_MANAGE);
        const shared = await this.repository.findSharedFileIds({
            fileIds: files.map((file) => file.id),
            taskIds: args.taskIds,
            goalId: args.sourceGoalId,
        });

        let remainingBytes = await this.remainingBytes(args.targetGoalId);
        for (const file of files) {
            if (canMove && !shared.has(file.id)) {
                plan.moveIds.push(file.id);
            } else if (this.canCopy(file) && (remainingBytes === null || file.sizeBytes <= remainingBytes)) {
                plan.copyIds.push(file.id);
                if (remainingBytes !== null) remainingBytes -= file.sizeBytes;
            } else {
                plan.leftIds.push(file.id);
            }
        }
        return plan;
    }

    private canCopy(file: TaskNoteFile): boolean {
        return this.storages.isConfigured && this.storages.has(file.storageProvider);
    }

    private async remainingBytes(goalId: number): Promise<number | null> {
        const quota = await this.quotas.forGoal(goalId);
        if (quota.mode !== 'enforce' || quota.quotaBytes === null || quota.usedBytes === null) return null;
        return Math.max(0, quota.quotaBytes - quota.usedBytes);
    }
}
