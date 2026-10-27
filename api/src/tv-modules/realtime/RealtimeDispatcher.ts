import { eq } from 'drizzle-orm';
import { CollaborationUsersSchema, UsersSchema } from 'taskview-db-schemas';
import { getCentrifugoClient } from '../../core/CentrifugoClient';
import type { Dispatcher } from '../../core/Dispatcher';
import { eventBus, type AppEvents } from '../../core/EventBus';
import { Database } from '../../modules/db';
import { $logger } from '../../modules/logget';
import { RealtimeRepository } from './RealtimeRepository';
import { REALTIME_TASKS_CHANGED_EVENT, type RealtimeTasksChangedArgs } from './types';

export class RealtimeDispatcher implements Dispatcher {
    private readonly repository = new RealtimeRepository();

    register(): void {
        eventBus.on('collaboration.userAdded', (data) => this.onCollaborationUserAdded(data));
        eventBus.on('collaboration.userRemoved', (data) => this.onCollaborationUserRemoved(data));
        eventBus.on('collaboration.rolesChanged', (data) => this.onCollaborationRolesChanged(data));

        eventBus.on('task.created', (data) => this.publishTasksChanged({ goalId: data.task.goalId, taskIds: [data.task.id], kind: 'created' }));
        eventBus.on('task.updated', (data) => this.publishTasksChanged({ goalId: data.task.goalId, taskIds: [data.task.id], kind: 'updated' }));
        eventBus.on('task.deleted', (data) => this.publishTasksChanged({ goalId: data.goalId, taskIds: [data.taskId], kind: 'deleted' }));
        eventBus.on('task.moved', (data) => this.onTaskMoved(data));
        eventBus.on('task.assigneesChanged', (data) => this.onTaskRelationsChanged(data.taskId));
        eventBus.on('task.tagsChanged', (data) => this.onTaskRelationsChanged(data.taskId));
    }

    async registerWorkers(): Promise<void> {}

    private async onCollaborationUserAdded(data: AppEvents['collaboration.userAdded']): Promise<void> {
        const userId = await this.resolveAuthUserIdByEmail(data.email);
        if (!userId) return;

        await this.publishToUser(userId, 'goals.changed', { goalId: data.goalId });
    }

    private async onCollaborationUserRemoved(data: AppEvents['collaboration.userRemoved']): Promise<void> {
        const userId = await this.resolveAuthUserIdByCollaborationUserId(data.collaborationUserId);
        if (!userId) return;

        await this.publishToUser(userId, 'goals.changed', { goalId: data.goalId });
    }

    private async onCollaborationRolesChanged(data: AppEvents['collaboration.rolesChanged']): Promise<void> {
        const userId = await this.resolveAuthUserIdByCollaborationUserId(data.collaborationUserId);
        if (!userId) return;

        await this.publishToUser(userId, 'goals.changed', { goalId: data.goalId });
    }

    private async onTaskMoved(data: AppEvents['task.moved']): Promise<void> {
        await Promise.all([
            this.publishTasksChanged({ goalId: data.fromGoalId, taskIds: data.taskIds, kind: 'deleted' }),
            this.publishTasksChanged({ goalId: data.toGoalId, taskIds: [data.task.id], kind: 'created' }),
        ]);
    }

    private async onTaskRelationsChanged(taskId: number): Promise<void> {
        if (!getCentrifugoClient().isEnabled()) return;
        const goalId = await this.repository.fetchTaskGoalId(taskId).catch((err) => {
            $logger.error(err, '[RealtimeDispatcher] can not resolve the project of a task');
            return null;
        });
        if (goalId) await this.publishTasksChanged({ goalId, taskIds: [taskId], kind: 'updated' });
    }

    private async publishTasksChanged(args: RealtimeTasksChangedArgs): Promise<void> {
        const centrifugo = getCentrifugoClient();
        if (!centrifugo.isEnabled()) return;
        try {
            const memberIds = await this.repository.fetchGoalMemberIds(args.goalId);
            await centrifugo.broadcastToUsers({ userIds: memberIds, event: REALTIME_TASKS_CHANGED_EVENT, data: args });
        } catch (err) {
            $logger.error(err, '[RealtimeDispatcher] tasks.changed publish failed');
        }
    }

    private async publishToUser(userId: number, event: string, data: Record<string, unknown>): Promise<void> {
        const centrifugo = getCentrifugoClient();
        await centrifugo.publishToUser(userId, event, data);
    }

    private async resolveAuthUserIdByEmail(email: string): Promise<number | null> {
        const db = Database.getInstance();
        const result = await db.dbDrizzle
            .select({ id: UsersSchema.id })
            .from(UsersSchema)
            .where(eq(UsersSchema.email, email))
            .limit(1);

        return result[0]?.id ?? null;
    }

    private async resolveAuthUserIdByCollaborationUserId(collaborationUserId: number): Promise<number | null> {
        const db = Database.getInstance();
        const result = await db.dbDrizzle
            .select({ id: UsersSchema.id })
            .from(CollaborationUsersSchema)
            .innerJoin(UsersSchema, eq(CollaborationUsersSchema.email, UsersSchema.email))
            .where(eq(CollaborationUsersSchema.id, collaborationUserId))
            .limit(1);

        return result[0]?.id ?? null;
    }
}
