import type { Dispatcher } from '../../core/Dispatcher';
import { getJobQueue } from '../../core/JobQueue';
import { $logger } from '../../modules/logget';
import { GoalsRepository } from '../goals/GoalsRepository';
import { ImportApplier } from './ImportApplier';
import { ImportRepository } from './ImportRepository';
import {
    IMPORT_CLEANUP_JOB,
    IMPORT_DRAFT_TTL_SECONDS,
    IMPORT_MAX_RUN_SECONDS,
    IMPORT_RUN_JOB,
    type ImportJobProgress,
    type ImportRunJobData,
} from './types';

const STALE_GRACE_SECONDS = 10 * 60;

export class ImportDispatcher implements Dispatcher {
    private readonly applier = new ImportApplier();
    private readonly repository = new ImportRepository();

    register(): void {}

    async registerWorkers(): Promise<void> {
        const boss = getJobQueue();
        await boss.createQueue(IMPORT_RUN_JOB, { retryLimit: 0, expireInSeconds: IMPORT_MAX_RUN_SECONDS });
        await boss.work<ImportRunJobData>(IMPORT_RUN_JOB, async ([job]) => {
            await this.applier.run(job.data.jobId);
        });

        await boss.createQueue(IMPORT_CLEANUP_JOB);
        await boss.schedule(IMPORT_CLEANUP_JOB, '*/30 * * * *');
        await boss.work(IMPORT_CLEANUP_JOB, async () => {
            await this.cleanup();
        });
    }

    private async cleanup(): Promise<void> {
        const now = Date.now();
        await this.repository.deleteDraftsCreatedBefore(new Date(now - IMPORT_DRAFT_TTL_SECONDS * 1000));
        await this.repository.expirePendingCreatedBefore(
            new Date(now - (IMPORT_DRAFT_TTL_SECONDS + IMPORT_MAX_RUN_SECONDS + STALE_GRACE_SECONDS) * 1000),
        );

        const stale = await this.repository.fetchRunningStartedBefore(new Date(now - (IMPORT_MAX_RUN_SECONDS + STALE_GRACE_SECONDS) * 1000));
        for (const job of stale) {
            const phase = (job.progress as ImportJobProgress | null)?.phase;
            const tasksWritten = phase === 'attachments' || phase === 'finalizing';
            if (job.goalId !== null && !tasksWritten) {
                await new GoalsRepository().deleteGoal(job.goalId);
            }
            await this.repository.finishJob({ id: job.id, status: 'failed', stats: null, error: 'interrupted' });
            $logger.warn(`[Import] job=${job.id} marked as interrupted`);
        }
    }
}
