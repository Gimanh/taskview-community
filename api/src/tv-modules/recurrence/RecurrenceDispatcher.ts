import { eq } from 'drizzle-orm';
import {
    CollaborationUsersSchema,
    CollaborationUsersToGoalsSchema,
    GoalsSchema,
    UsersSchema,
} from 'taskview-db-schemas';
import { getCentrifugoClient } from '../../core/CentrifugoClient';
import type { Dispatcher } from '../../core/Dispatcher';
import type { AppEvents } from '../../core/EventBus';
import { eventBus } from '../../core/EventBus';
import { getJobQueue } from '../../core/JobQueue';
import { Database } from '../../modules/db';
import { $logger } from '../../modules/logget';
import { RecurrenceGenerator } from './RecurrenceGenerator';
import { RecurrenceRepository } from './RecurrenceRepository';

export const RECURRENCE_RECONCILE_JOB = 'recurrence-reconcile';
const RECURRENCE_RT_EVENT = 'recurrence.instanceCreated';

export class RecurrenceDispatcher implements Dispatcher {
    private readonly generator = new RecurrenceGenerator();
    private readonly repository = new RecurrenceRepository();

    register(): void {
        // The heart of the lazy model: completing the open instance materializes the next one.
        eventBus.on('task.updated', (data) => this.onTaskUpdated(data));
        // Push the freshly materialized instance to goal members so the next card appears without a refresh.
        eventBus.on('task.created', (data) => this.onTaskCreated(data));
        // An ex-collaborator must not keep being auto-assigned to new instances:
        // project removal deletes users_to_goals, not collaboration.users, so the
        // FK CASCADE on the snapshot never fires — clean it up explicitly.
        eventBus.on('collaboration.userRemoved', (data) => this.onCollaboratorRemoved(data));
    }

    async registerWorkers(): Promise<void> {
        const boss = getJobQueue();
        await boss.createQueue(RECURRENCE_RECONCILE_JOB);
        // Safety net only: re-creates the open instance for series stalled by a
        // crash between the complete commit and the event handler. Normally a no-op.
        await boss.schedule(RECURRENCE_RECONCILE_JOB, '0 3 * * *');
        await boss.work(RECURRENCE_RECONCILE_JOB, async () => {
            const stalled = await this.repository.findStalledActiveRules();
            for (const rule of stalled) {
                await this.generator
                    .materializeNext({ ruleId: rule.id, initiatorId: rule.creatorId })
                    .catch((e) => $logger.error(e, `[RecurrenceDispatcher] reconcile rule=${rule.id}`));
            }
            if (stalled.length > 0) {
                $logger.info(`[RecurrenceDispatcher] reconcile recovered ${stalled.length} stalled series`);
            }
        });
    }

    private async onTaskUpdated(data: AppEvents['task.updated']): Promise<void> {
        if (!data.task.recurrenceRuleId) return;
        if (data.changes.complete === true) {
            await this.generator.materializeNext({
                ruleId: data.task.recurrenceRuleId,
                initiatorId: data.initiatorId,
            });
            return;
        }
        await this.syncTemplateFromOpenInstance(data);
    }

    /**
     * In the lazy model the open instance IS the series in the user's mind
     * (Todoist mental model): renaming the card must rename future occurrences
     * too, otherwise the next instance "reverts" to the stale snapshot.
     * Completed instances are history and never touch the template.
     */
    private async syncTemplateFromOpenInstance(data: AppEvents['task.updated']): Promise<void> {
        if (data.task.complete) return;

        const patch: Parameters<RecurrenceRepository['patch']>[0]['patch'] = {};
        if (data.changes.description !== undefined && data.task.description !== null) {
            patch.templateDescription = data.task.description;
        }
        if (data.changes.note !== undefined) patch.templateNote = data.task.note;
        if (data.changes.priorityId !== undefined) patch.templatePriorityId = data.task.priorityId;
        if (Object.keys(patch).length === 0) return;

        await this.repository.patch({ ruleId: data.task.recurrenceRuleId as number, patch });
    }

    private async onTaskCreated(data: AppEvents['task.created']): Promise<void> {
        if (!data.task.recurrenceRuleId) return;
        try {
            const memberIds = await this.resolveGoalMemberIds(data.task.goalId);
            if (memberIds.length === 0) return;
            const centrifugo = getCentrifugoClient();
            // The broadcast goes to every goal member, while notes are gated by a
            // separate per-role permission — never put them on the wire here.
            // Clients with note access get it when they open the task.
            const task = { ...data.task, note: null };
            await Promise.all(
                memberIds.map((userId) =>
                    centrifugo.publishToUser(userId, RECURRENCE_RT_EVENT, {
                        goalId: data.task.goalId,
                        ruleId: data.task.recurrenceRuleId,
                        task,
                    })
                )
            );
        } catch (err) {
            $logger.error(err, '[RecurrenceDispatcher] real-time publish failed');
        }
    }

    private async onCollaboratorRemoved(data: AppEvents['collaboration.userRemoved']): Promise<void> {
        await this.repository.removeTemplateAssigneeFromGoal({
            goalId: data.goalId,
            collabUserId: data.collaborationUserId,
        });
    }

    private async resolveGoalMemberIds(goalId: number): Promise<number[]> {
        const db = Database.getInstance();
        const [ownerRows, collabRows] = await Promise.all([
            db.dbDrizzle.select({ id: GoalsSchema.owner }).from(GoalsSchema).where(eq(GoalsSchema.id, goalId)).limit(1),
            db.dbDrizzle
                .select({ id: UsersSchema.id })
                .from(CollaborationUsersToGoalsSchema)
                .innerJoin(
                    CollaborationUsersSchema,
                    eq(CollaborationUsersToGoalsSchema.userId, CollaborationUsersSchema.id)
                )
                .innerJoin(UsersSchema, eq(CollaborationUsersSchema.email, UsersSchema.email))
                .where(eq(CollaborationUsersToGoalsSchema.goalId, goalId)),
        ]);

        const ids = new Set<number>();
        if (ownerRows[0]?.id) ids.add(ownerRows[0].id);
        for (const row of collabRows) ids.add(row.id);
        return [...ids];
    }
}
