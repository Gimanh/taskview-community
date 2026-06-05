import { eq } from 'drizzle-orm';
import {
    CollaborationUsersSchema,
    CollaborationUsersToGoalsSchema,
    GoalsSchema,
    UsersSchema,
} from 'taskview-db-schemas';
import { getCentrifugoClient } from '../../core/CentrifugoClient';
import type { Dispatcher } from '../../core/Dispatcher';
import { eventBus } from '../../core/EventBus';
import { Database } from '../../modules/db';
import { $logger } from '../../modules/logget';
import { SprintScheduler } from './SprintScheduler';

const SPRINT_RT_EVENT = 'sprints.changed';

export class SprintsDispatcher implements Dispatcher {
    private readonly scheduler = new SprintScheduler();

    register(): void {
        eventBus.on('sprint.created', (d) => this.notifyGoalMembers(d.sprint.goalId, { sprintId: d.sprint.id }));
        eventBus.on('sprint.updated', (d) => this.notifyGoalMembers(d.sprint.goalId, { sprintId: d.sprint.id }));
        eventBus.on('sprint.activated', (d) => this.notifyGoalMembers(d.goalId, { sprintId: d.sprintId }));
        eventBus.on('sprint.reviewStarted', (d) => this.notifyGoalMembers(d.goalId, { sprintId: d.sprintId }));
        eventBus.on('sprint.completed', (d) => this.notifyGoalMembers(d.goalId, { sprintId: d.sprintId }));
        eventBus.on('sprint.paused', (d) => this.notifyGoalMembers(d.goalId, { sprintId: d.sprintId }));
        eventBus.on('sprint.resumed', (d) => this.notifyGoalMembers(d.goalId, { sprintId: d.sprintId }));
        eventBus.on('sprint.deleted', (d) => this.notifyGoalMembers(d.goalId, { sprintId: d.sprintId }));
        eventBus.on('task.assignedToSprint', (d) =>
            this.notifyGoalMembers(d.goalId, { sprintId: d.sprintId, prevSprintId: d.prevSprintId, taskId: d.taskId })
        );
    }

    async registerWorkers(): Promise<void> {
        await this.scheduler.registerCadenceWorker();
    }

    private async notifyGoalMembers(goalId: number, payload: Record<string, unknown>): Promise<void> {
        try {
            const memberIds = await this.resolveGoalMemberIds(goalId);
            if (memberIds.length === 0) return;
            const centrifugo = getCentrifugoClient();
            await Promise.all(
                memberIds.map((userId) => centrifugo.publishToUser(userId, SPRINT_RT_EVENT, { goalId, ...payload }))
            );
        } catch (err) {
            $logger.error(err, '[SprintsDispatcher] real-time publish failed');
        }
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
        collabRows.forEach((r) => ids.add(r.id));
        return [...ids];
    }
}
