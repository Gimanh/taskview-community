import { getJobQueue } from '../../core/JobQueue';
import {
    AUTOMATION_RUN_CONCURRENCY,
    AUTOMATION_RUN_POLLING_SECONDS,
    AUTOMATION_RUN_QUEUE,
    AUTOMATION_RUN_RETRY_LIMIT,
    type AutomationRunJob,
    type AutomationRunJobHandler,
} from './types';

export class AutomationRunQueue {
    private workerId: string | null = null;

    async work(handler: AutomationRunJobHandler): Promise<void> {
        const boss = getJobQueue();
        await boss.createQueue(AUTOMATION_RUN_QUEUE);
        this.workerId = await boss.work<AutomationRunJob>(
            AUTOMATION_RUN_QUEUE,
            {
                localConcurrency: AUTOMATION_RUN_CONCURRENCY,
                groupConcurrency: 1,
                pollingIntervalSeconds: AUTOMATION_RUN_POLLING_SECONDS,
            },
            async ([job]) => handler(job.data)
        );
    }

    async enqueue(job: AutomationRunJob): Promise<void> {
        const boss = getJobQueue();
        await boss.send(AUTOMATION_RUN_QUEUE, job, {
            group: { id: String(job.taskId) },
            retryLimit: AUTOMATION_RUN_RETRY_LIMIT,
            retryBackoff: true,
        });
        if (this.workerId) boss.notifyWorker(this.workerId);
    }
}
