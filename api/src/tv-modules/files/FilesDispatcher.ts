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

const FILES_RT_EVENT = 'files.changed';

export class FilesDispatcher implements Dispatcher {
    register(): void {
        eventBus.on('files.changed', (d) => this.notifyGoalMembers(d.goalId, { taskIds: d.taskIds }));
    }

    async registerWorkers(): Promise<void> {}

    private async notifyGoalMembers(goalId: number, payload: Record<string, unknown>): Promise<void> {
        try {
            const memberIds = await this.resolveGoalMemberIds(goalId);
            if (memberIds.length === 0) return;
            const centrifugo = getCentrifugoClient();
            await Promise.all(
                memberIds.map((userId) => centrifugo.publishToUser(userId, FILES_RT_EVENT, { goalId, ...payload }))
            );
        } catch (err) {
            $logger.error(err, '[FilesDispatcher] real-time publish failed');
        }
    }

    private async resolveGoalMemberIds(goalId: number): Promise<number[]> {
        const db = Database.getInstance();
        const [ownerRows, collabRows] = await Promise.all([
            db.dbDrizzle.select({ id: GoalsSchema.owner }).from(GoalsSchema).where(eq(GoalsSchema.id, goalId)).limit(1),
            db.dbDrizzle
                .select({ id: UsersSchema.id })
                .from(CollaborationUsersToGoalsSchema)
                .innerJoin(CollaborationUsersSchema, eq(CollaborationUsersToGoalsSchema.userId, CollaborationUsersSchema.id))
                .innerJoin(UsersSchema, eq(CollaborationUsersSchema.email, UsersSchema.email))
                .where(eq(CollaborationUsersToGoalsSchema.goalId, goalId)),
        ]);

        const ids = new Set<number>();
        if (ownerRows[0]?.id) ids.add(ownerRows[0].id);
        for (const row of collabRows) ids.add(row.id);
        return [...ids];
    }
}
