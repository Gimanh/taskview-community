import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { CollaborationUsersSchema, CollaborationUsersToGoalsSchema, GoalsSchema, TasksSchema, UsersSchema } from 'taskview-db-schemas';
import { Database } from '../../modules/db';

const AuthUsers = alias(UsersSchema, 'auth_users');

export class RealtimeRepository {
    private readonly db = Database.getInstance();

    async fetchGoalMemberIds(goalId: number): Promise<number[]> {
        const [ownerRows, collabRows] = await Promise.all([
            this.db.dbDrizzle.select({ id: GoalsSchema.owner }).from(GoalsSchema).where(eq(GoalsSchema.id, goalId)).limit(1),
            this.db.dbDrizzle
                .select({ id: AuthUsers.id })
                .from(CollaborationUsersToGoalsSchema)
                .innerJoin(CollaborationUsersSchema, eq(CollaborationUsersToGoalsSchema.userId, CollaborationUsersSchema.id))
                .innerJoin(AuthUsers, eq(CollaborationUsersSchema.email, AuthUsers.email))
                .where(eq(CollaborationUsersToGoalsSchema.goalId, goalId)),
        ]);

        const ids = new Set<number>();
        if (ownerRows[0]?.id) ids.add(ownerRows[0].id);
        for (const row of collabRows) ids.add(row.id);
        return [...ids];
    }

    async fetchTaskGoalId(taskId: number): Promise<number | null> {
        const rows = await this.db.dbDrizzle.select({ goalId: TasksSchema.goalId }).from(TasksSchema).where(eq(TasksSchema.id, taskId)).limit(1);
        return rows[0]?.goalId ?? null;
    }
}
