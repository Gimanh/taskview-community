import type { FileDuplicator } from '../files/FileDuplicator';
import type { FileQuotaResolver } from '../files/FileQuotaResolver';
import type { FilesRepository } from '../files/FilesRepository';
import type {
    TaskMoveFileCopies,
    TaskMoveFileCopy,
    TaskMoveFileQuota,
    TaskNoteFileCopierArgs,
    TaskNoteFileCopierPrepareArgs,
} from './task-move.types';

export class TaskNoteFileCopier {
    private readonly filesRepository: FilesRepository;
    private readonly duplicator: FileDuplicator;
    private readonly quotas: FileQuotaResolver;

    constructor(args: TaskNoteFileCopierArgs) {
        this.filesRepository = args.filesRepository;
        this.duplicator = args.duplicator;
        this.quotas = args.quotas;
    }

    // Bytes are copied before the transaction: storage calls are slow and cannot be rolled back with it
    async prepare(args: TaskNoteFileCopierPrepareArgs): Promise<TaskMoveFileCopies> {
        const { plan } = args;
        const items: TaskMoveFileCopy[] = [];
        const files = await this.filesRepository.getByIds(plan.noteFiles.copyIds);
        for (const file of files) {
            if (file.goalId !== plan.sourceGoalId) continue;
            const row = await this.duplicator.duplicate({
                file,
                targetGoalId: plan.targetGoalId,
                uploaderId: args.uploaderId,
                uploaderEmail: args.uploaderEmail,
            });
            if (row) items.push({ sourceId: file.id, row });
        }
        return {
            items,
            quota: items.length > 0 ? await this.quota(plan.targetGoalId) : null,
            linkedById: args.uploaderId,
            linkedByEmail: args.uploaderEmail,
        };
    }

    async discardUnsaved(copies: TaskMoveFileCopies): Promise<void> {
        if (copies.items.length === 0) return;
        const saved = new Set((await this.filesRepository.getByIds(copies.items.map((copy) => copy.row.id as string))).map((row) => row.id));
        await this.duplicator.discard(copies.items.filter((copy) => !saved.has(copy.row.id as string)).map((copy) => copy.row));
    }

    private async quota(goalId: number): Promise<TaskMoveFileQuota | null> {
        const quota = await this.quotas.forGoal(goalId);
        if (quota.mode !== 'enforce' || quota.organizationId === null || quota.quotaBytes === null) return null;
        return { organizationId: quota.organizationId, quotaBytes: quota.quotaBytes };
    }
}
