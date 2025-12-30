import { and, eq, ne } from 'drizzle-orm';
import {
    CollaborationUsersSchema,
    CollaborationUsersToGoalsSchema,
    GoalsSchema,
    type GoalsSchemaTypeForSelect,
} from 'taskview-db-schemas';
import type { AppUser } from '../../core/AppUser';
import { Database } from '../../modules/db';
import { $logger } from '../../modules/logget';
import type { AddGoalToDbArg, GoalItemInDb, GoalItemsInDb, UpdateGoalDbArg } from '../../types/goal.type';
import { logError } from '../../utils/api';
import { updateQuery } from '../../utils/db-helper';
import { callWithCatch } from '../../utils/helpers';
import type { GoalsArgAdd, GoalsArgDelete, GoalsArgUpdate } from './types';

export class GoalsRepository {
    private readonly db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    async fetchGoalsForUser(user: AppUser): Promise<GoalItemsInDb> {
        const userData = user.getUserData();

        if (!userData) {
            return [];
        }

        const goals = await this.db
            .query<GoalItemInDb>('select * from tasks.goals where owner = $1 order by id desc', [userData.id])
            .catch(logError);

        if (!goals) {
            return [];
        }

        return goals.rows;
    }

    async addGoal(goalData: AddGoalToDbArg): Promise<GoalItemInDb | false> {
        const query = goalData.description
            ? 'INSERT INTO tasks.goals (name,  owner, description) VALUES ($1,$2,$3) RETURNING id;'
            : 'INSERT INTO tasks.goals (name,  owner) VALUES ($1,$2) RETURNING id;';

        const args = goalData.description
            ? [goalData.name, goalData.userId, goalData.description]
            : [goalData.name, goalData.userId];

        const result = await this.db.query(query, args).catch(logError);

        if (!result) {
            return false;
        }

        if (result.rowCount === 0) {
            return false;
        }
        return await this.fetchGoalById(result.rows[0].id);
    }

    async fetchGoalById(goalId: number): Promise<GoalItemInDb | false> {
        const goal = await this.db
            .query<GoalItemInDb>('select * from tasks.goals where id = $1', [goalId])
            .catch(logError);

        if (!goal) {
            return false;
        }

        if (goal.rows.length === 0) {
            return false;
        }
        return goal.rows[0];
    }

    async updateGoal(data: UpdateGoalDbArg): Promise<boolean> {
        const queryData = updateQuery({
            table: 'tasks.goals',
            data: {
                name: data.name,
                description: data.description,
            },
            where: {
                id: data.id,
            },
        });
        const result = await this.db.query(queryData.query, queryData.args).catch(logError);

        if (!result) {
            return false;
        }

        return !!(result.rowCount && result.rowCount > 0);
    }

    async deleteGoal(goalId: number): Promise<boolean> {
        const del = await this.db.query('delete from tasks.goals where id = $1', [goalId]).catch(logError);

        if (!del) {
            return false;
        }

        return !!(del.rowCount && del.rowCount > 0);
    }

    async fetchSharedGoals(user: AppUser): Promise<GoalItemInDb[]> {
        if (!user.getUserData()?.email) {
            $logger.error('Trying fetch shared goals without active user');
            return [];
        }

        const result = await this.db
            .query<GoalItemInDb>(
                `select tg.* from tasks.goals tg
            left join collaboration.users_to_goals utg on utg.goal_id = tg.id
            left join collaboration.users cu on cu.id = utg.user_id
                    where cu.email = $1 and tg.owner <> $2`,
                [user.getUserData()?.email, user.getUserData()?.id]
            )
            .catch(logError);

        if (!result) {
            return [];
        }

        return result.rows;
    }

    async fetchSharedGoalsForUser(user: AppUser): Promise<GoalsSchemaTypeForSelect[]> {
        // debugger;
        const result = await callWithCatch(() => {
            const query = this.db.dbDrizzle
                .select({
                    id: GoalsSchema.id,
                    name: GoalsSchema.name,
                    description: GoalsSchema.description,
                    color: GoalsSchema.color,
                    dateCreation: GoalsSchema.dateCreation,
                    owner: GoalsSchema.owner,
                    creatorId: GoalsSchema.creatorId,
                    editDate: GoalsSchema.editDate,
                    archive: GoalsSchema.archive,
                })
                .from(GoalsSchema)
                .leftJoin(CollaborationUsersToGoalsSchema, eq(GoalsSchema.id, CollaborationUsersToGoalsSchema.goalId))
                .leftJoin(
                    CollaborationUsersSchema,
                    eq(CollaborationUsersToGoalsSchema.userId, CollaborationUsersSchema.id)
                )
                .where(
                    and(
                        eq(CollaborationUsersSchema.email, user.getUserData()?.email!),
                        ne(GoalsSchema.owner, user.getUserData()?.id!)
                    )
                );
            // const sql = query.toSQL();
            // console.log('query', sql);
            return query;
        });

        return result ?? [];
    }

    async updateArchive(goalId: number, archive: GoalItemInDb['archive']): Promise<boolean> {
        const queryData = updateQuery({
            table: 'tasks.goals',
            data: {
                archive: archive,
            },
            where: {
                id: goalId,
            },
        });

        const result = await this.db.query(queryData.query, queryData.args).catch(logError);

        if (!result) {
            return false;
        }

        return !!(result.rowCount && result.rowCount > 0);
    }

    async fetchAllOwnGoalsIds(user: AppUser): Promise<number[]> {
        const ownGoals = await this.db
            .query<{ id: number }>('select id from tasks.goals where owner = $1 and archive = $2', [
                user.getUserData()?.id,
                0,
            ])
            .catch(logError);

        if (!ownGoals) {
            $logger.error(`Can not fetch own goals for all state`);
            return [];
        }

        return ownGoals.rows.map((g) => g.id);
    }

    async createGoal(goalData: GoalsArgAdd, userId: number): Promise<GoalsSchemaTypeForSelect | false> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .insert(GoalsSchema)
                .values({
                    ...goalData,
                    owner: userId,
                })
                .returning()
        );

        if (!result) {
            return false;
        }

        return result[0];
    }

    async updateGoalNew(goalData: GoalsArgUpdate): Promise<GoalsSchemaTypeForSelect | false> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.update(GoalsSchema).set(goalData).where(eq(GoalsSchema.id, goalData.id)).returning()
        );
        if (!result) {
            return false;
        }

        return result[0];
    }

    async deleteGoalNew(goalData: GoalsArgDelete): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.delete(GoalsSchema).where(eq(GoalsSchema.id, goalData.goalId))
        );

        if (!result) {
            return false;
        }

        return !!(result?.rowCount && result.rowCount > 0);
    }

    async fetchGoalsNew(userId: number): Promise<GoalsSchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(GoalsSchema).where(eq(GoalsSchema.owner, userId))
        );
        if (!result) {
            return [];
        }

        return result;
    }
}
