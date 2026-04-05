import { and, eq, inArray, isNotNull, or } from 'drizzle-orm';
import { GoalsSchema, GoalsListSchema } from 'taskview-db-schemas';
import type { AppUser } from '../../core/AppUser';
import { Database } from '../../modules/db';
import { $logger } from '../../modules/logget';
import type { TaskItemInDb } from '../../types/tasks.types';
import { logError } from '../../utils/api';
import { callWithCatch } from '../../utils/helpers';
import type { TagToTaskInDb } from '../tags/tags.types';
import { TaskItemForClient } from '../tasks/TaskItemForClient';
import type { AssigneesForTaskFromDb, FetchAllListsResult, UsersByProjectsFromDb } from './start.types';

//TODO: refactor 
export class StartRepository {
    public readonly db: Database;
    public readonly user: AppUser;

    constructor(user: AppUser) {
        this.db = Database.getInstance();
        this.user = user;
    }

    async fetchAllLists(user: AppUser, organizationId?: number): Promise<FetchAllListsResult[] | false> {
        const userId = user.getUserData()?.id
        if (!userId) return false

        const sharedGoals = await user.goalsManager.fetchSharedGoals(organizationId)
        const sharedGoalIds = sharedGoals.map((g) => g.id)

        const ownConditions = [eq(GoalsSchema.owner, userId)]
        if (organizationId) {
            ownConditions.push(eq(GoalsSchema.organizationId, organizationId))
        }

        const goalConditions = sharedGoalIds.length > 0
            ? or(and(...ownConditions), inArray(GoalsSchema.id, sharedGoalIds))
            : and(...ownConditions)

        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({
                    goalName: GoalsSchema.name,
                    goalId: GoalsSchema.id,
                    listName: GoalsListSchema.name,
                    listId: GoalsListSchema.id,
                })
                .from(GoalsSchema)
                .leftJoin(GoalsListSchema, eq(GoalsListSchema.goalId, GoalsSchema.id))
                .where(
                    and(
                        eq(GoalsListSchema.archive, 0),
                        isNotNull(GoalsListSchema.id),
                        goalConditions,
                    )
                )
        )

        return result ?? []
    }

    async fetchUsersByProjects(goalIds: number[]) {
        if (goalIds.length === 0) return []

        const args = goalIds
        const placeholders = goalIds.map((_, i) => `$${i + 1}`).join(',')

        const query = `SELECT
                        g.id, g.name,
                        COALESCE(json_agg(json_build_object('id', u.id, 'email', u.email)) FILTER (WHERE u.id IS NOT NULL), '[]') AS users
                    FROM
                        tasks.goals g
                    LEFT JOIN collaboration.users_to_goals utg ON utg.goal_id = g.id
                    LEFT JOIN collaboration.users u ON u.id = utg.user_id
                    WHERE g.id IN (${placeholders})
                    GROUP BY g.id, g.name;`

        const result = await this.db.query<UsersByProjectsFromDb>(query, args)

        if (!result) {
            $logger.error(`Can not fetch user by projects`)
            return []
        }

        return result.rows
    }

    async fetchAssigneesForTasks(goalIds: number[]) {
        if (goalIds.length === 0) return []

        const placeholders = goalIds.map((_, i) => `$${i + 1}`).join(',')

        const query = `SELECT cu.email, ta.task_id AS "taskId", ta.collab_user_id AS "collabUserId"
                    FROM tasks.tasks tt
                        INNER JOIN tasks_auth.task_assignee ta ON ta.task_id = tt.id
                        INNER JOIN collaboration.users cu ON cu.id = ta.collab_user_id
                    WHERE ta.collab_user_id IS NOT NULL
                        AND tt.goal_id IN (${placeholders})`

        const result = await this.db.query<AssigneesForTaskFromDb>(query, goalIds)

        if (!result) return []

        return result.rows
    }

    async fetchAllActiveTasksForGoals(
        goalsIds: number[],
        assignees?: AssigneesForTaskFromDb[],
    ): Promise<TaskItemForClient[]> {
        if (goalsIds.length === 0) {
            return [];
        }
        const placeholders = goalsIds.map((_id, index) => {
            return `$${index + 1}`;
        });

        const map: Map<number, TaskItemForClient> = new Map();

        const result = await this.db.query<TaskItemInDb>(
            `select * from tasks.tasks where goal_id in (${placeholders.join(',')}) and complete = FALSE and parent_id is null and end_date is null ORDER BY priority_id DESC, date_creation DESC LIMIT 30`,
            goalsIds
        );

        if (!result) {
            return [];
        }

        result.rows.forEach((t) => {
            if (!map.get(t.id)) {
                map.set(t.id, new TaskItemForClient(t));
            }
        });

        const tagsQuery = `select ttt.*
                            from tasks.tags
                                    left join tasks.tasks_to_tags ttt on tags.id = ttt.tag_id
                            where goal_id in (${placeholders.join(',')}) and owner = $${goalsIds.length + 1};`;

        const tagsResult = await this.db.query<TagToTaskInDb>(tagsQuery, [...goalsIds, this.user.getUserData()?.id]);

        if (tagsResult) {
            tagsResult.rows.forEach((r) => {
                if (map.get(r.task_id)) {
                    map.get(r.task_id)?.tags.push(r.tag_id);
                }
            });
        }

        if (assignees) {
            assignees.forEach((i) => {
                if (map.get(i.taskId)) {
                    map.get(i.taskId)?.assignedUsers.push(i.collabUserId);
                }
            });
        }

        return [...map.values()];
    }

    async fetchUpcomingTasksForGoals(
        goalsIds: number[],
        tz: string,
        assignees?: AssigneesForTaskFromDb[]
    ): Promise<TaskItemForClient[]> {
        if (!tz) {
            $logger.error('tz is required for fetchAllTodayTasksForGoals');
            return [];
        }

        if (goalsIds.length === 0) {
            return [];
        }
        const placeholders = goalsIds.map((_id, index) => {
            return `$${index + 1}`;
        });

        const map: Map<number, TaskItemForClient> = new Map();

        const query = `SELECT 
                t.*,
                t.start_date::text,
                t.end_date::text
            FROM tasks.tasks t
            WHERE 
                t.goal_id in (${placeholders.join(',')}) and
                t.parent_id IS NULL  
                AND (
                    (t.end_date::date > (NOW() AT TIME ZONE $${placeholders.length + 1})::date)
                )
            ORDER BY 
                t.end_date ASC,  
                t.priority_id DESC,  
                t.id ASC limit 30;`;

        const result = await this.db.query<TaskItemInDb>(query, [...goalsIds, tz]);

        if (!result) {
            return [];
        }

        result.rows.forEach((t) => {
            if (!map.get(t.id)) {
                map.set(t.id, new TaskItemForClient(t));
            }
        });

        const tagsQuery = `select ttt.*
                            from tasks.tags
                                    left join tasks.tasks_to_tags ttt on tags.id = ttt.tag_id
                            where goal_id in (${placeholders.join(',')}) and owner = $${goalsIds.length + 1};`;

        const tagsResult = await this.db.query<TagToTaskInDb>(tagsQuery, [...goalsIds, this.user.getUserData()?.id]);

        if (tagsResult) {
            tagsResult.rows.forEach((r) => {
                if (map.get(r.task_id)) {
                    map.get(r.task_id)?.tags.push(r.tag_id);
                }
            });
        }

        if (assignees) {
            assignees.forEach((i) => {
                if (map.get(i.taskId)) {
                    map.get(i.taskId)?.assignedUsers.push(i.collabUserId);
                }
            });
        }

        return [...map.values()];
    }

    async fetchAllTodayTasksForGoals(
        goalsIds: number[],
        tz: string,
        assignees?: AssigneesForTaskFromDb[]
    ): Promise<TaskItemForClient[]> {
        if (!tz) {
            $logger.error('tz is required for fetchAllTodayTasksForGoals');
            return [];
        }

        if (goalsIds.length === 0) {
            return [];
        }
        const placeholders = goalsIds.map((_id, index) => {
            return `$${index + 1}`;
        });

        const map: Map<number, TaskItemForClient> = new Map();

        const query = `SELECT 
                t.*,
                t.start_date::text,
                t.end_date::text
            FROM tasks.tasks t
            WHERE 
                t.goal_id in (${placeholders.join(',')}) and
                t.parent_id IS NULL  
                AND (
                    (t.end_date::date = (NOW() AT TIME ZONE $${placeholders.length + 1})::date)
                    OR
                    (t.end_date::date < (NOW() AT TIME ZONE $${placeholders.length + 1})::date AND t.complete = false)
                )
            ORDER BY 
                t.end_date ASC,
                t.priority_id DESC,
                t.id ASC;`;

        const result = await this.db.query<TaskItemInDb>(
            query,
            [...goalsIds, tz]
        );

        if (!result) {
            return [];
        }

        result.rows.forEach((t) => {
            if (!map.get(t.id)) {
                map.set(t.id, new TaskItemForClient(t));
            }
        });

        const tagsQuery = `select ttt.*
                            from tasks.tags
                                    left join tasks.tasks_to_tags ttt on tags.id = ttt.tag_id
                            where goal_id in (${placeholders.join(',')}) and owner = $${goalsIds.length + 1};`;

        const tagsResult = await this.db.query<TagToTaskInDb>(tagsQuery, [...goalsIds, this.user.getUserData()?.id]);

        if (tagsResult) {
            tagsResult.rows.forEach((r) => {
                if (map.get(r.task_id)) {
                    map.get(r.task_id)?.tags.push(r.tag_id);
                }
            });
        }

        if (assignees) {
            assignees.forEach((i) => {
                if (map.get(i.taskId)) {
                    map.get(i.taskId)?.assignedUsers.push(i.collabUserId);
                }
            });
        }

        return [...map.values()];
    }

    async fetchLastCompletedTasksForGoals(
        goalsIds: number[],
        assignees?: AssigneesForTaskFromDb[]
    ): Promise<TaskItemForClient[]> {
        if (goalsIds.length === 0) {
            return [];
        }
        const placeholders = goalsIds.map((_id, index) => {
            return `$${index + 1}`;
        });

        const taskIdToTaskMap: Map<number, TaskItemForClient> = new Map();

        const query = `SELECT 
                t.*,
                t.start_date::text,
                t.end_date::text
            FROM tasks.tasks t
            WHERE 
                t.goal_id in (${placeholders.join(',')}) and
                t.parent_id IS NULL
                AND t.complete = true
            ORDER BY 
                t.date_complete DESC limit 30;`;

        const result = await this.db.query<TaskItemInDb>(query, [...goalsIds]);

        if (!result) {
            return [];
        }

        result.rows.forEach((t) => {
            if (!taskIdToTaskMap.get(t.id)) {
                taskIdToTaskMap.set(t.id, new TaskItemForClient(t));
            }
        });

        const tagsQuery = `select ttt.*
                            from tasks.tags
                                    left join tasks.tasks_to_tags ttt on tags.id = ttt.tag_id
                            where goal_id in (${placeholders.join(',')}) and owner = $${goalsIds.length + 1};`;

        const tagsResult = await this.db.query<TagToTaskInDb>(tagsQuery, [...goalsIds, this.user.getUserData()?.id]);

        if (tagsResult) {
            tagsResult.rows.forEach((r) => {
                if (taskIdToTaskMap.get(r.task_id)) {
                    taskIdToTaskMap.get(r.task_id)?.tags.push(r.tag_id);
                }
            });
        }

        if (assignees) {
            assignees.forEach((i) => {
                if (taskIdToTaskMap.get(i.taskId)) {
                    taskIdToTaskMap.get(i.taskId)?.assignedUsers.push(i.collabUserId);
                }
            });
        }

        return [...taskIdToTaskMap.values()];
    }

    async searchTask(description: string, goalsIds: number[]): Promise<TaskItemForClient[]> {
        if (goalsIds.length === 0 || !description.trim()) {
            return [];
        }
        const placeholders = goalsIds.map((_id, index) => {
            return `$${index + 1}`;
        });

        const result = await this.db.query<TaskItemInDb>(
            `select * from tasks.tasks where goal_id in (${placeholders.join(',')}) and complete = FALSE and parent_id is null and description ILIKE $${goalsIds.length + 1}`,
            [...goalsIds, `%${description}%`]
        );

        if (!result) {
            return [];
        }

        const map: Map<number, TaskItemForClient> = new Map();

        result.rows.forEach((t) => {
            if (!map.get(t.id)) {
                map.set(t.id, new TaskItemForClient(t));
            }
        });

        return [...map.values()];
    }
}
