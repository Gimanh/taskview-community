import { eq } from 'drizzle-orm';
import { TasksSchema } from 'taskview-db-schemas';
import { eventBus, type AppEvents } from '../../core/EventBus';
import { getJobQueue } from '../../core/JobQueue';
import { decrypt } from '../../utils/crypto';
import { $logger } from '../../modules/logget';
import { Database } from '../../modules/db';
import { WebhooksRepository } from './WebhooksRepository';
import { WebhooksManager } from './WebhooksManager';
import type { WebhookDeliverJobData } from './types';
import type { Dispatcher } from '../../core/Dispatcher';

const WEBHOOK_DELIVER_JOB = 'webhook-deliver';
const MAX_ATTEMPTS = 3;
const MAX_CONSECUTIVE_FAILURES = 10;

export class WebhooksDispatcher implements Dispatcher {
    private readonly repository = new WebhooksRepository();
    private readonly manager = new WebhooksManager();

    register(): void {
        eventBus.on('task.created', (data) => this.dispatch('task.created', data.task.goalId, data));
        eventBus.on('task.updated', (data) => this.dispatch('task.updated', data.task.goalId, data));
        eventBus.on('task.deleted', (data) => this.dispatch('task.deleted', data.goalId, data));
        eventBus.on('task.assigneesChanged', (data) => this.dispatchAssigneesChanged(data));
    }

    async registerWorkers(): Promise<void> {
        const boss = getJobQueue();
        await boss.createQueue(WEBHOOK_DELIVER_JOB);
        await boss.work<WebhookDeliverJobData>(WEBHOOK_DELIVER_JOB, async ([job]) => {
            await this.deliverJob(job.data);
        });
    }

    private async dispatch(event: string, goalId: number, payload: object): Promise<void> {
        const webhooks = await this.repository.fetchActiveByGoalIdAndEvent(goalId, event);
        for (const webhook of webhooks) {
            await this.enqueueDelivery(webhook.id, webhook.url, webhook.secretEncrypted, event, {
                event,
                timestamp: new Date().toISOString(),
                ...payload,
            });
        }
    }

    private async dispatchAssigneesChanged(data: AppEvents['task.assigneesChanged']): Promise<void> {
        const db = Database.getInstance();
        const task = await db.dbDrizzle.select().from(TasksSchema).where(eq(TasksSchema.id, data.taskId)).limit(1);
        if (!task[0]) return;
        await this.dispatch('task.assigneesChanged', task[0].goalId, data);
    }

    private async enqueueDelivery(webhookId: number, url: string, secretEncrypted: string, event: string, payload: object): Promise<void> {
        const delivery = await this.repository.createDelivery({ webhookId, event, payload });
        if (!delivery) return;

        const boss = getJobQueue();
        await boss.send(WEBHOOK_DELIVER_JOB, {
            deliveryId: delivery.id,
            webhookId,
            url,
            secretEncrypted,
            payload,
            attempt: 1,
        } satisfies WebhookDeliverJobData);
    }

    private async deliverJob(data: WebhookDeliverJobData): Promise<void> {
        const secret = decrypt(data.secretEncrypted);
        const result = await this.manager.deliver(data.url, secret, data.payload);

        await this.repository.updateDelivery(data.deliveryId, {
            status: result.success ? 'success' : (data.attempt >= MAX_ATTEMPTS ? 'failed' : 'pending'),
            responseCode: result.responseCode,
            attempts: data.attempt,
        });

        if (result.success) {
            await this.repository.resetConsecutiveFailures(data.webhookId);
            return;
        }

        if (data.attempt < MAX_ATTEMPTS) {
            const boss = getJobQueue();
            const delay = Math.pow(2, data.attempt) * 5;
            await boss.send(WEBHOOK_DELIVER_JOB, {
                ...data,
                attempt: data.attempt + 1,
            }, { startAfter: delay });
            return;
        }

        const failures = await this.repository.incrementConsecutiveFailures(data.webhookId);
        if (failures >= MAX_CONSECUTIVE_FAILURES) {
            await this.repository.deactivate(data.webhookId);
            $logger.warn(`[Webhooks] Deactivated webhook=${data.webhookId} after ${failures} consecutive failures`);
        } else {
            $logger.warn(`[Webhooks] Delivery failed for webhook=${data.webhookId}, consecutive failures: ${failures}/${MAX_CONSECUTIVE_FAILURES}`);
        }
    }
}
