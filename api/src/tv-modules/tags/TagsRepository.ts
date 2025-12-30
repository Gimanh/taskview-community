import { and, eq, inArray } from 'drizzle-orm';
import type { TagsSchemaTypeForSelect } from 'taskview-db-schemas';
import { GoalsSchema, TagsSchema, TasksToTagsSchema } from 'taskview-db-schemas';
import type { AppUser } from '../../core/AppUser';
import { Database } from '../../modules/db';
import { GoalPermissions } from '../../types/auth.types';
import { logError } from '../../utils/api';
import { callWithCatch } from '../../utils/helpers';
import type { TagItemArgAdd, TagItemArgUpdate, TagItemInDb } from './tags.types';

export class TagsRepository {
    private readonly db: Database;
    private readonly user: AppUser;

    constructor(user: AppUser) {
        this.user = user;
        this.db = Database.getInstance();
    }

    async fetchTagById(id: number): Promise<TagItemInDb | false> {
        const query = 'SELECT * FROM tasks.tags WHERE id = $1;';
        const result = await this.db.query<TagItemInDb>(query, [id]).catch(logError);

        if (!result) {
            return false;
        }
        return result.rows[0];
    }

    /** @deprecated use addTagNew instead */
    async addTag(name: string, color: string, goalId: number | null = null): Promise<TagItemInDb | false> {
        const query = `
            INSERT INTO tasks.tags (name, color, owner, goal_id) 
            VALUES ($1, $2, (SELECT owner FROM tasks.goals WHERE id = $3), $3) 
            RETURNING id;
        `;

        const result = await this.db.query(query, [name, color, goalId]).catch(logError);

        if (!result) {
            return false;
        }

        return this.fetchTagById(result.rows[0].id);
    }

    async addTagNew(data: TagItemArgAdd): Promise<TagsSchemaTypeForSelect | null> {
        const tagResult = await callWithCatch(() =>
            this.db.dbDrizzle.transaction(async (tx) => {
                const goal = await tx
                    .select({ owner: GoalsSchema.owner })
                    .from(GoalsSchema)
                    .where(eq(GoalsSchema.id, data.goalId));

                if (!goal) {
                    throw new Error('Goal not found');
                }

                const result = await tx
                    .insert(TagsSchema)
                    .values({
                        ...data,
                        owner: goal[0].owner,
                    })
                    .returning();

                return result[0];
            })
        );

        if (!tagResult) {
            return null;
        }

        return tagResult;
    }
    /** @deprecated use fetchAllTagsForUser instead */
    async fetchAll(userId: number): Promise<TagItemInDb[] | false> {
        const tags = await this.db.query('SELECT * FROM tasks.tags WHERE owner = $1;', [userId]).catch(logError);

        if (!tags) {
            return false;
        }

        const sharedGoals = await this.user.goalsManager.fetchSharedGoals();

        if (sharedGoals.length > 0) {
            const goalIds: number[] = [];
            sharedGoals.forEach((goal) => {
                //Не уверен что тут надо именно данное разрешение
                if (goal.permissions[GoalPermissions.TASKS_CAN_WATCH_TAGS]) {
                    goalIds.push(goal.id);
                }
            });

            if (goalIds.length > 0) {
                const placeholders = goalIds.map((_, i) => `$${i + 1}`).join(',');

                const sharedTags = await this.db
                    .query(`SELECT * FROM tasks.tags WHERE goal_id IN (${placeholders})`, goalIds)
                    .catch(logError);

                if (sharedTags) {
                    tags.rows = [...tags.rows, ...sharedTags.rows];
                }
            }
        }

        return tags.rows;
    }

    async fetchAllTagsForUser(userId: number): Promise<TagsSchemaTypeForSelect[]> {
        const ownTags = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(TagsSchema).where(eq(TagsSchema.owner, userId))
        );

        const allTags: TagsSchemaTypeForSelect[] = [];

        if (ownTags) {
            allTags.push(...ownTags);
        }

        const sharedGoals = await this.user.goalsManager.fetchSharedGoals();

        if (sharedGoals.length > 0) {
            const goalIds: number[] = [];
            sharedGoals.forEach((goal) => {
                if (goal.permissions[GoalPermissions.TASKS_CAN_WATCH_TAGS]) {
                    goalIds.push(goal.id);
                }
            });

            if (goalIds.length > 0) {
                const sharedTags = await callWithCatch(() =>
                    this.db.dbDrizzle.select().from(TagsSchema).where(inArray(TagsSchema.goalId, goalIds))
                );
                if (sharedTags) {
                    allTags.push(...sharedTags);
                }
            }
        }

        return allTags;
    }

    async tagExists(tagId: number, taskId: number): Promise<boolean> {
        const tagExists = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(TasksToTagsSchema)
                .where(and(eq(TasksToTagsSchema.tagId, tagId), eq(TasksToTagsSchema.taskId, taskId)))
        );

        if (!tagExists) {
            return false;
        }

        return tagExists.length > 0;
    }

    /** @deprecated */
    async deleteTagFromTask(tagId: number, taskId: number): Promise<boolean | -1> {
        const query = 'DELETE FROM tasks.tasks_to_tags WHERE tag_id = $1 AND task_id = $2;';
        const result = await this.db.query(query, [tagId, taskId]).catch(logError);

        if (!result) {
            return -1;
        }

        return !!(result.rowCount && result.rowCount > 0);
    }

    async toggleTagNew(tagId: number, taskId: number): Promise<'delete' | 'add' | null> {
        const tagExists = await this.tagExists(tagId, taskId);

        if (tagExists) {
            const deleteResult = await callWithCatch(() =>
                this.db.dbDrizzle
                    .delete(TasksToTagsSchema)
                    .where(and(eq(TasksToTagsSchema.tagId, tagId), eq(TasksToTagsSchema.taskId, taskId)))
                    .returning()
            );
            if (!deleteResult) {
                return null;
            }
            return 'delete';
        } else {
            const insert = await callWithCatch(() =>
                this.db.dbDrizzle.insert(TasksToTagsSchema).values({ tagId, taskId }).returning()
            );
            if (!insert) {
                return null;
            }
            return 'add';
        }
    }

    async addTagToTask(tagId: number, taskId: number): Promise<boolean> {
        const query = 'INSERT INTO tasks.tasks_to_tags (tag_id, task_id) VALUES ($1, $2);';
        const result = await this.db.query(query, [tagId, taskId]).catch(logError);
        if (!result) {
            return false;
        }
        return !!(result.rowCount && result.rowCount > 0);
    }

    /** @deprecated use deleteTagNew instead */
    async deleteTag(tagId: number): Promise<boolean> {
        const query = 'DELETE FROM tasks.tags WHERE id = $1;';
        const result = await this.db.query(query, [tagId]).catch(logError);

        if (!result) {
            return false;
        }

        return !!(result.rowCount && result.rowCount > 0);
    }

    async deleteTagNew(tagId: number): Promise<boolean> {
        const result = await callWithCatch(() => this.db.dbDrizzle.delete(TagsSchema).where(eq(TagsSchema.id, tagId)));

        if (!result) {
            return false;
        }

        return !!(result?.rowCount && result.rowCount > 0);
    }

    async updateTag(id: number, name: string, color: string, goalId: number | null): Promise<TagItemInDb | false> {
        const query = `
            UPDATE tasks.tags 
            SET name = $1, color = $2, goal_id = $3 
            WHERE id = $4;
        `;
        const result = await this.db.query(query, [name.trim(), color.trim(), goalId, id]).catch(logError);

        if (!result) {
            return false;
        }

        return this.fetchTagById(id);
    }

    async updateTagNew(data: TagItemArgUpdate): Promise<TagsSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .update(TagsSchema)
                .set(data)
                .where(and(eq(TagsSchema.id, data.id), eq(TagsSchema.goalId, data.goalId)))
                .returning()
        );

        return result?.[0] ?? null;
    }
}
