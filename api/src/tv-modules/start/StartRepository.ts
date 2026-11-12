import { and, count, desc, eq, gte, ilike, inArray, isNotNull, isNull, lt, lte, notExists, or, sql } from 'drizzle-orm';
import { CollaborationUsersSchema, GoalsSchema, GoalsListSchema, TasksAssigneeSchema, TasksSchema, TasksToTagsSchema, type TasksSchemaTypeForSelect } from 'taskview-db-schemas';
import type { AppUser } from '../../core/AppUser';
import { Database } from '../../modules/db';
import { $logger } from '../../modules/logget';
import type { TaskItemInDb } from '../../types/tasks.types';
import { logError } from '../../utils/api';
import { callWithCatch } from '../../utils/helpers';
import { TaskItemForClient } from '../tasks/TaskItemForClient';
import type {
    AssigneesForTaskFromDb,
    FetchAllListsResult,
    FetchDashboardAttentionArgs,
    FetchDashboardCompletedArgs,
    FetchDashboardCompletedRangeArgs,
    FetchDashboardDeadlineRangeArgs,
    FetchDashboardTasksByIdArgs,
    FetchTasksInPeriodArgs,
    SearchTaskArgs,
    SearchTaskResult,
    StartDashboardAssignee,
    StartDashboardAttentionCandidate,
    StartDashboardCompletedTask,
    StartDashboardGoalCount,
    StartDashboardOpenGroup,
    StartDashboardTaskDescription,
    StartDashboardWorkloadGroup,
    StartTaskTagFromDb,
    UsersByProjectsFromDb,
} from './start.types';

//TODO: refactor 
export class StartRepository {
    public readonly db: Database;
    public readonly user: AppUser;

    constructor(user: AppUser) {
        this.db = Database.getInstance();
        this.user = user;
    }

    // Same period rule as the project calendar: a task with a single date spans just that day
    async fetchTasksInPeriod(args: FetchTasksInPeriodArgs): Promise<TasksSchemaTypeForSelect[]> {
        if (args.goalIds.length === 0) return [];
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(TasksSchema)
                .where(
                    and(
                        inArray(TasksSchema.goalId, args.goalIds),
                        isNull(TasksSchema.parentId),
                        sql`COALESCE(${TasksSchema.endDate}, ${TasksSchema.startDate}) >= ${args.from}`,
                        sql`COALESCE(${TasksSchema.startDate}, ${TasksSchema.endDate}) <= ${args.to}`
                    )
                )
                .orderBy(TasksSchema.id)
        );
        return result ?? [];
    }

    async fetchActiveGoalIds(goalIds: number[]): Promise<number[]> {
        if (goalIds.length === 0) return [];
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ id: GoalsSchema.id })
                .from(GoalsSchema)
                .where(and(inArray(GoalsSchema.id, goalIds), eq(GoalsSchema.archive, 0)))
        );
        return (result ?? []).map((goal) => goal.id);
    }

    // Open top-level tasks counted per project, deadline and priority: the dashboard never loads the tasks themselves
    async fetchDashboardOpenGroups(goalIds: number[]): Promise<StartDashboardOpenGroup[]> {
        if (goalIds.length === 0) return [];
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({
                    goalId: TasksSchema.goalId,
                    endDate: TasksSchema.endDate,
                    endTime: TasksSchema.endTime,
                    priorityId: TasksSchema.priorityId,
                    count: count(),
                })
                .from(TasksSchema)
                .where(this.dashboardOpenTasks(goalIds))
                .groupBy(TasksSchema.goalId, TasksSchema.endDate, TasksSchema.endTime, TasksSchema.priorityId)
        );
        return result ?? [];
    }

    async fetchDashboardAssignedGroups(goalIds: number[]): Promise<StartDashboardWorkloadGroup[]> {
        if (goalIds.length === 0) return [];
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({
                    goalId: TasksSchema.goalId,
                    email: CollaborationUsersSchema.email,
                    endDate: TasksSchema.endDate,
                    endTime: TasksSchema.endTime,
                    count: count(),
                })
                .from(TasksAssigneeSchema)
                .innerJoin(TasksSchema, eq(TasksSchema.id, TasksAssigneeSchema.taskId))
                .innerJoin(CollaborationUsersSchema, eq(CollaborationUsersSchema.id, TasksAssigneeSchema.collabUserId))
                .where(this.dashboardOpenTasks(goalIds))
                .groupBy(TasksSchema.goalId, CollaborationUsersSchema.email, TasksSchema.endDate, TasksSchema.endTime)
        );
        return result ?? [];
    }

    async fetchDashboardUnassignedGroups(goalIds: number[]): Promise<StartDashboardWorkloadGroup[]> {
        if (goalIds.length === 0) return [];
        const assigned = this.db.dbDrizzle
            .select({ taskId: TasksAssigneeSchema.taskId })
            .from(TasksAssigneeSchema)
            .where(eq(TasksAssigneeSchema.taskId, TasksSchema.id));
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({
                    goalId: TasksSchema.goalId,
                    endDate: TasksSchema.endDate,
                    endTime: TasksSchema.endTime,
                    count: count(),
                })
                .from(TasksSchema)
                .where(and(this.dashboardOpenTasks(goalIds), notExists(assigned)))
                .groupBy(TasksSchema.goalId, TasksSchema.endDate, TasksSchema.endTime)
        );
        return (result ?? []).map((group) => ({ ...group, email: null }));
    }

    // The open tasks whose deadlines come first: the few the dashboard lists by name are picked among them
    async fetchDashboardAttentionCandidates(args: FetchDashboardAttentionArgs): Promise<StartDashboardAttentionCandidate[]> {
        if (args.goalIds.length === 0) return [];
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({
                    id: TasksSchema.id,
                    goalId: TasksSchema.goalId,
                    endDate: TasksSchema.endDate,
                    endTime: TasksSchema.endTime,
                })
                .from(TasksSchema)
                .where(and(this.dashboardOpenTasks(args.goalIds), lte(TasksSchema.endDate, args.until)))
                .orderBy(TasksSchema.endDate, TasksSchema.id)
                .limit(args.limit)
        );
        return result ?? [];
    }

    // Every open task with a deadline in the given days, without its content: the caller keeps the ones of its column
    async fetchDashboardOpenByDeadline(args: FetchDashboardDeadlineRangeArgs): Promise<StartDashboardAttentionCandidate[]> {
        if (args.goalIds.length === 0) return [];
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({
                    id: TasksSchema.id,
                    goalId: TasksSchema.goalId,
                    endDate: TasksSchema.endDate,
                    endTime: TasksSchema.endTime,
                })
                .from(TasksSchema)
                .where(
                    and(
                        this.dashboardOpenTasks(args.goalIds),
                        lte(TasksSchema.endDate, args.until),
                        args.from ? gte(TasksSchema.endDate, args.from) : undefined
                    )
                )
                .orderBy(TasksSchema.endDate, TasksSchema.id)
        );
        return result ?? [];
    }

    async fetchDashboardCompletedPage(args: FetchDashboardCompletedRangeArgs): Promise<StartDashboardCompletedTask[]> {
        if (args.goalIds.length === 0) return [];
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ id: TasksSchema.id, goalId: TasksSchema.goalId, dateComplete: TasksSchema.dateComplete })
                .from(TasksSchema)
                .where(this.dashboardCompletedBetween(args))
                .orderBy(desc(TasksSchema.dateComplete), desc(TasksSchema.id))
                .limit(args.limit)
                .offset(args.offset)
        );
        return result ?? [];
    }

    async countDashboardCompleted(args: FetchDashboardCompletedRangeArgs): Promise<number> {
        if (args.goalIds.length === 0) return 0;
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select({ total: count() }).from(TasksSchema).where(this.dashboardCompletedBetween(args))
        );
        return result?.[0]?.total ?? 0;
    }

    async fetchDashboardDescriptions(args: FetchDashboardTasksByIdArgs): Promise<StartDashboardTaskDescription[]> {
        if (args.goalIds.length === 0 || args.taskIds.length === 0) return [];
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ id: TasksSchema.id, description: TasksSchema.description })
                .from(TasksSchema)
                .where(and(inArray(TasksSchema.id, args.taskIds), inArray(TasksSchema.goalId, args.goalIds)))
        );
        return result ?? [];
    }

    async fetchDashboardTaskAssignees(args: FetchDashboardTasksByIdArgs): Promise<StartDashboardAssignee[]> {
        if (args.goalIds.length === 0 || args.taskIds.length === 0) return [];
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ taskId: TasksAssigneeSchema.taskId, email: CollaborationUsersSchema.email })
                .from(TasksAssigneeSchema)
                .innerJoin(TasksSchema, eq(TasksSchema.id, TasksAssigneeSchema.taskId))
                .innerJoin(CollaborationUsersSchema, eq(CollaborationUsersSchema.id, TasksAssigneeSchema.collabUserId))
                .where(and(inArray(TasksSchema.id, args.taskIds), inArray(TasksSchema.goalId, args.goalIds)))
                .orderBy(TasksAssigneeSchema.taskId, TasksAssigneeSchema.collabUserId)
        );
        return result ?? [];
    }

    async fetchDashboardGoalCounts(goalIds: number[]): Promise<StartDashboardGoalCount[]> {
        if (goalIds.length === 0) return [];
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ goalId: TasksSchema.goalId, done: count() })
                .from(TasksSchema)
                .where(and(...this.dashboardTopLevelTasks(goalIds), eq(TasksSchema.complete, true)))
                .groupBy(TasksSchema.goalId)
        );
        return result ?? [];
    }

    async fetchDashboardCompletedDates(args: FetchDashboardCompletedArgs): Promise<Date[]> {
        if (args.goalIds.length === 0) return [];
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ dateComplete: TasksSchema.dateComplete })
                .from(TasksSchema)
                .where(
                    and(
                        ...this.dashboardTopLevelTasks(args.goalIds),
                        eq(TasksSchema.complete, true),
                        gte(TasksSchema.dateComplete, args.since)
                    )
                )
        );
        return (result ?? []).flatMap((row) => (row.dateComplete ? [row.dateComplete] : []));
    }

    // The caller passes only active projects it may see: see StartManager.fetchDashboard
    private dashboardTopLevelTasks(goalIds: number[]) {
        return [inArray(TasksSchema.goalId, goalIds), isNull(TasksSchema.parentId)];
    }

    private dashboardCompletedBetween(args: FetchDashboardCompletedRangeArgs) {
        return and(
            ...this.dashboardTopLevelTasks(args.goalIds),
            eq(TasksSchema.complete, true),
            gte(TasksSchema.dateComplete, args.from),
            lt(TasksSchema.dateComplete, args.to)
        );
    }

    private dashboardOpenTasks(goalIds: number[]) {
        return and(
            ...this.dashboardTopLevelTasks(goalIds),
            or(isNull(TasksSchema.complete), eq(TasksSchema.complete, false))
        );
    }

    async fetchListsForGoals(goalIds: number[]): Promise<FetchAllListsResult[]> {
        if (goalIds.length === 0) return []

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
                        inArray(GoalsSchema.id, goalIds),
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

    async fetchTagIdsForTasks(taskIds: number[]): Promise<StartTaskTagFromDb[]> {
        if (taskIds.length === 0) return [];

        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ taskId: TasksToTagsSchema.taskId, tagId: TasksToTagsSchema.tagId })
                .from(TasksToTagsSchema)
                .where(inArray(TasksToTagsSchema.taskId, taskIds))
        );

        return result ?? [];
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
            `select * from tasks.tasks where goal_id in (${placeholders.join(',')}) and complete = FALSE and parent_id is null and end_date is null ORDER BY date_creation DESC, id DESC LIMIT 30`,
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

        const taskTags = await this.fetchTagIdsForTasks([...map.keys()]);
        taskTags.forEach((r) => {
            map.get(r.taskId)?.tags.push(r.tagId);
        });

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

        const taskTags = await this.fetchTagIdsForTasks([...map.keys()]);
        taskTags.forEach((r) => {
            map.get(r.taskId)?.tags.push(r.tagId);
        });

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

        const taskTags = await this.fetchTagIdsForTasks([...map.keys()]);
        taskTags.forEach((r) => {
            map.get(r.taskId)?.tags.push(r.tagId);
        });

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

        const taskTags = await this.fetchTagIdsForTasks([...taskIdToTaskMap.keys()]);
        taskTags.forEach((r) => {
            taskIdToTaskMap.get(r.taskId)?.tags.push(r.tagId);
        });

        if (assignees) {
            assignees.forEach((i) => {
                if (taskIdToTaskMap.get(i.taskId)) {
                    taskIdToTaskMap.get(i.taskId)?.assignedUsers.push(i.collabUserId);
                }
            });
        }

        return [...taskIdToTaskMap.values()];
    }

    async searchTask(args: SearchTaskArgs): Promise<SearchTaskResult[]> {
        const description = args.description.trim();
        if (args.goalsIds.length === 0 || !description) {
            return [];
        }

        const idMatch = description.match(/^#(\d+)$/);
        const searchCondition = idMatch
            ? eq(TasksSchema.id, Number(idMatch[1]))
            : and(
                eq(TasksSchema.complete, false),
                isNull(TasksSchema.parentId),
                ilike(TasksSchema.description, `%${description}%`),
            );

        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(TasksSchema)
                .where(and(inArray(TasksSchema.goalId, args.goalsIds), searchCondition))
        );

        if (!result) {
            return [];
        }

        return result.map((task) => ({
            ...task,
            tags: [],
            assignedUsers: [],
            historyId: null,
            subtasks: [],
        }));
    }
}
