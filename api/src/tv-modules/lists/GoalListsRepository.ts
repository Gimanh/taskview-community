import { desc, eq } from 'drizzle-orm';
import type { GoalsListSchemaTypeForSelect } from 'taskview-db-schemas';
import { GoalsListSchema } from 'taskview-db-schemas';
import type { AppUser } from '../../core/AppUser';
import { Database } from '../../modules/db';
import type { GoalListInDb } from '../../types/goal-list.types';
import { logError } from '../../utils/api';
import { updateQuery } from '../../utils/db-helper';
import { callWithCatch } from '../../utils/helpers';
import type { GoalListArgAdd, GoalListArgDelete, GoalListArgFetch, GoalListArgUpdate } from './list.types';

export class GoalListsRepository {
    private readonly db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    /**@deprecated use fetchListsNew instead */
    async fetchAllLists(goalId: number): Promise<GoalListInDb[] | false> {
        const lists = await this.db
            .query<GoalListInDb>('SELECT g.* FROM tasks.goal_lists g WHERE goal_id = $1 ORDER BY id DESC;', [goalId])
            .catch(logError);
        if (!lists) {
            return false;
        }
        return lists.rows;
    }

    async fetchListsNew(data: GoalListArgFetch): Promise<GoalsListSchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(GoalsListSchema)
                .where(eq(GoalsListSchema.goalId, data.goalId))
                .orderBy(desc(GoalsListSchema.id))
        );
        return result ?? [];
    }

    async addList(name: string, goalId: number, user: AppUser): Promise<GoalListInDb | false> {
        const result = await this.db
            .query<{ id: number }>(
                'INSERT INTO tasks.goal_lists (name, goal_id, creator_id) VALUES ($1, $2, $3) RETURNING id;',
                [name, goalId, user.getUserData()?.id]
            )
            .catch(logError);

        if (!result) {
            return false;
        }
        if (result.rowCount === 0) {
            return false;
        }
        return await this.fetchListById(result.rows[0].id);
    }

    async addListNew(data: GoalListArgAdd & { creatorId: number }): Promise<GoalsListSchemaTypeForSelect[]> {
        const result = await callWithCatch(() => this.db.dbDrizzle.insert(GoalsListSchema).values(data).returning());
        if (!result) {
            return [];
        }
        return result;
    }

    async fetchListById(listId: number): Promise<GoalListInDb | false> {
        const result = await this.db
            .query<GoalListInDb>('SELECT g.* FROM tasks.goal_lists g WHERE g.id = $1 ORDER BY id DESC;', [listId])
            .catch(logError);
        if (!result) {
            return false;
        }
        return result.rows[0];
    }

    /**
     *
     * @deprecated use updateListNew instead
     */
    async updateList(listId: number, name: string): Promise<boolean> {
        const queryData = updateQuery({
            table: 'tasks.goal_lists',
            data: {
                name: name,
            },
            where: {
                id: listId,
            },
        });
        const result = await this.db.query(queryData.query, queryData.args).catch(logError);

        if (!result) {
            return false;
        }

        return !!(result.rowCount && result.rowCount > 0);
    }

    async updateListNew(data: GoalListArgUpdate): Promise<GoalsListSchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.update(GoalsListSchema).set(data).where(eq(GoalsListSchema.id, data.id)).returning()
        );
        if (!result) {
            return [];
        }
        return result;
    }

    /**@deprecated use deleteListNew instead */
    async deleteList(listId: number): Promise<boolean> {
        const del = await this.db.query('DELETE FROM tasks.goal_lists WHERE id = $1;', [listId]).catch(logError);

        if (!del) {
            return false;
        }

        return !!(del.rowCount && del.rowCount > 0);
    }

    async deleteListNew(data: GoalListArgDelete): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.delete(GoalsListSchema).where(eq(GoalsListSchema.id, data.id)).returning()
        );
        if (!result) {
            return false;
        }
        return !!result.length;
    }

    async updateArchive(listId: number, archive: GoalListInDb['archive']): Promise<boolean> {
        const queryData = updateQuery({
            table: 'tasks.goal_lists',
            data: {
                archive: archive,
            },
            where: {
                id: listId,
            },
        });
        const result = await this.db.query(queryData.query, queryData.args).catch(logError);

        if (!result) {
            return false;
        }

        return !!(result.rowCount && result.rowCount > 0);
    }
}
