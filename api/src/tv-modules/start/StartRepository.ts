import type { AppUser } from '../../core/AppUser';
import { Database } from '../../modules/db';
import { $logger } from '../../modules/logget';
import type { TaskItemInDb } from '../../types/tasks.types';
import { logError } from '../../utils/api';
import type { TagToTaskInDb } from '../tags/tags.types';
import { TaskItemForClient } from '../tasks/TaskItemForClient';
import type { AssigneesForTaskFromDb, FetchAllListsResult, UsersByProjectsFromDb } from './start.types';

export class StartRepository {
    public readonly db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    async fetchAllLists(user: AppUser): Promise<FetchAllListsResult[] | false> {
        const sharedGoals = await user.goalsManager.fetchSharedGoals();
        const sharedGoalsIds = sharedGoals.map((g) => g.id);
        const archive = 0;

        if (!user.getUserData()?.id) {
            return false;
        }

        let args: any[] = [archive, user.getUserData()?.id];

        let query = `select g.name as "goalName", g.id as "goalId", gl.name as "listName", gl.id as "listId"
                        from tasks.goals g
                                left join tasks.goal_lists gl on gl.goal_id = g.id
                        where gl.archive = $1
                        and g.owner = $2
                        and gl.id is not null `;
        const placeholders = sharedGoalsIds.map((_item, index) => `$${index + 3}`);

        if (sharedGoalsIds.length > 0) {
            args = [...args, ...sharedGoalsIds];
            query += ` or g.id in (${placeholders.join(',')})`;
        }

        const result = await this.db.query<FetchAllListsResult>(query, args).catch(logError);
        return result?.rows || [];
    }

    async fetchUsersByProjects(owner: number, sharedGoalsIds: number[] = []) {
        let additionalRules = '';
        const args: number[] = [owner];

        if (sharedGoalsIds.length > 0) {
            const placeholders = sharedGoalsIds.map((id, index) => {
                args.push(id);
                return `$${index + 2}`;
            });
            additionalRules = ` or g.id in (${placeholders.join(',')}) `;
        }

        const query = `SELECT 
                        g.id, g.name,
                        COALESCE(json_agg(json_build_object('id', u.id, 'email', u.email)) FILTER (WHERE u.id IS NOT NULL), '[]') AS users
                    FROM 
                        tasks.goals g
                    left join collaboration.users_to_goals utg on utg.goal_id = g.id
                    LEFT JOIN 
                        collaboration.users u ON u.id = utg.user_id
                    WHERE 
                        g.owner = $1 ${additionalRules}
                    GROUP BY 
                        g.id, g.name;`;

        const result = await this.db.query<UsersByProjectsFromDb>(query, args);

        if (!result) {
            $logger.error(`Can not fetch user by projects`);
            return [];
        }

        return result.rows;
    }

    async fetchAssigneesForTasks(owner: number, goalsIds: number[] = []) {
        let assigneeQuery = `select cu.email, ta.task_id as "taskId", ta.collab_user_id as "collabUserId"
                        from tasks.tasks tt
                            inner join tasks_auth.task_assignee ta on ta.task_id = tt.id
                            inner join collaboration.users cu on cu.id = ta.collab_user_id
                        where ta.collab_user_id is not null`;

        const args: number[] = [owner];

        if (goalsIds.length > 0) {
            const placeholders = goalsIds.map((id, index) => {
                args.push(id);
                return `$${index + 2}`;
            });
            assigneeQuery += ` and (tt.owner = $1 or tt.goal_id in (${placeholders.join(',')})) `;
        } else {
            assigneeQuery += ` and (tt.owner = $1)`;
        }

        const result = await this.db.query<AssigneesForTaskFromDb>(assigneeQuery, args);

        if (!result) {
            return [];
        }

        return result.rows;
    }

    async fetchAllActiveTasksForGoals(
        goalsIds: number[],
        assignees?: AssigneesForTaskFromDb[]
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
                            where owner = 1 and goal_id in (${placeholders.join(',')});`;

        const tagsResult = await this.db.query<TagToTaskInDb>(tagsQuery, goalsIds);

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
                            where owner = 1 and goal_id in (${placeholders.join(',')});`;

        const tagsResult = await this.db.query<TagToTaskInDb>(tagsQuery, goalsIds);

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
                            where owner = 1 and goal_id in (${placeholders.join(',')});`;

        const tagsResult = await this.db.query<TagToTaskInDb>(tagsQuery, goalsIds);

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
                            where owner = 1 and goal_id in (${placeholders.join(',')});`;

        const tagsResult = await this.db.query<TagToTaskInDb>(tagsQuery, goalsIds);

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
