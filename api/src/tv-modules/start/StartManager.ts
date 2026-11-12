import type { StartDashboard, StartDashboardTaskList } from 'taskview-api';
import type { AppUser } from '../../core/AppUser';
import type { GoalAccess } from '../../core/GoalAccess';
import { GoalPermissions } from '../../types/auth.types';
import { hideUnwatchableTaskFields } from '../tasks/task-field-visibility';
import type { TaskForClientNew } from '../tasks/tasks.server.types';
import { StartDashboardBuilder } from './StartDashboardBuilder';
import { StartDashboardTaskPicker } from './StartDashboardTaskPicker';
import { StartRepository } from './StartRepository';
import type {
    FetchCalendarTasksArgs,
    FetchDashboardArgs,
    FetchDashboardListArgs,
    FetchDashboardTaskDetailsArgs,
    FetchDashboardTasksArgs,
    StartDashboardAttentionDetails,
    StartDashboardListedPage,
    StartDashboardScope,
    StartTasksVisibilityArgs,
    StartVisibleTask,
} from './start.types';

export class StartManager {
    public readonly user: AppUser;
    public readonly repository: StartRepository;

    constructor(user: AppUser) {
        this.user = user;
        this.repository = new StartRepository(this.user);
    }

    async fetchAllLists(organizationId?: number) {
        const access = await this.fetchGoalAccess(organizationId);
        return await this.repository.fetchListsForGoals(access.goalIdsWith(GoalPermissions.GOAL_CAN_WATCH_CONTENT));
    }

    async fetchAllState(tz: string, organizationId?: number) {
        const access = await this.fetchGoalAccess(organizationId);
        const goalIds = access.goalIdsWith(GoalPermissions.COMPONENT_CAN_WATCH_CONTENT);
        const assigneeGoalIds = goalIds.filter((id) =>
            access.checkerFor(id).hasPermissions(GoalPermissions.TASKS_CAN_WATCH_ASSIGNED_USERS)
        );

        const users = await this.repository.fetchUsersByProjects(
            access.goalIdsWith(GoalPermissions.GOAL_CAN_MANAGE_USERS)
        );
        const assignees = await this.repository.fetchAssigneesForTasks(assigneeGoalIds);
        const tasks = await this.repository.fetchAllActiveTasksForGoals(goalIds, assignees);
        const tasksToday = await this.repository.fetchAllTodayTasksForGoals(goalIds, tz, assignees);
        const tasksUpcoming = await this.repository.fetchUpcomingTasksForGoals(goalIds, tz, assignees);
        const tasksLastCompleted = await this.repository.fetchLastCompletedTasksForGoals(goalIds, assignees);

        return {
            tasks: this.applyTaskVisibility({ tasks, access }),
            tasksToday: this.applyTaskVisibility({ tasks: tasksToday, access }),
            tasksUpcoming: this.applyTaskVisibility({ tasks: tasksUpcoming, access }),
            tasksLastCompleted: this.applyTaskVisibility({ tasks: tasksLastCompleted, access }),
            users,
            assignees,
        };
    }

    async searchTaskInAllProjects(description?: string, organizationId?: number) {
        if (!description) return [];

        const access = await this.fetchGoalAccess(organizationId);
        const goalIds = access.goalIdsWith(GoalPermissions.COMPONENT_CAN_WATCH_CONTENT);
        const tasks = await this.repository.searchTask({ description, goalsIds: goalIds });
        return this.applyTaskVisibility({ tasks, access });
    }

    async fetchCalendarTasks(args: FetchCalendarTasksArgs): Promise<TaskForClientNew[]> {
        const access = await this.fetchGoalAccess(args.organizationId);
        const goalIds = access.goalIdsWith(GoalPermissions.COMPONENT_CAN_WATCH_CONTENT);
        const tasks = await this.repository.fetchTasksInPeriod({ goalIds, from: args.from, to: args.to });

        const byGoal = new Map<number, typeof tasks>();
        for (const task of tasks) {
            byGoal.set(task.goalId, [...(byGoal.get(task.goalId) ?? []), task]);
        }
        const extended = await Promise.all(
            [...byGoal.values()].map((goalTasks) => this.user.tasksManager.extendTasksWithTagsAndAssignees(goalTasks))
        );
        return extended.flat();
    }

    async fetchDashboard(args: FetchDashboardArgs): Promise<StartDashboard> {
        const scope = await this.fetchDashboardScope(args.organizationId);
        const { goalIds, assigneeGoalIds, priorityGoalIds } = scope;

        const now = new Date();
        const [openGroups, goalCounts, completedDates, assignedGroups, unassignedGroups, attentionCandidates] =
            await Promise.all([
                this.repository.fetchDashboardOpenGroups(goalIds),
                this.repository.fetchDashboardGoalCounts(goalIds),
                this.repository.fetchDashboardCompletedDates({
                    goalIds,
                    since: StartDashboardBuilder.completedSince(now),
                }),
                this.repository.fetchDashboardAssignedGroups(assigneeGoalIds),
                this.repository.fetchDashboardUnassignedGroups(assigneeGoalIds),
                this.repository.fetchDashboardAttentionCandidates({
                    goalIds,
                    until: StartDashboardBuilder.attentionUntil({ now, tz: args.tz }),
                    limit: StartDashboardBuilder.ATTENTION_CANDIDATES,
                }),
            ]);

        const builder = new StartDashboardBuilder({
            now,
            tz: args.tz,
            weekStart: args.weekStart ?? 1,
            openGroups,
            workloadGroups: [...assignedGroups, ...unassignedGroups],
            attentionCandidates,
            goalCounts,
            completedDates,
            assigneeGoalIds: new Set(assigneeGoalIds),
            priorityGoalIds: new Set(priorityGoalIds),
        });

        return builder.build(await this.fetchDashboardTaskDetails({ scope, taskIds: builder.attentionTaskIds() }));
    }

    /** The tasks behind one column of the dashboard, counted over the same projects as the dashboard itself */
    async fetchDashboardTasks(args: FetchDashboardTasksArgs): Promise<StartDashboardTaskList> {
        const scope = await this.fetchDashboardScope(args.organizationId);
        const picker = new StartDashboardTaskPicker({
            now: new Date(),
            tz: args.tz,
            bucket: args.bucket,
            date: args.date,
        });
        const { total, listed } =
            args.bucket === 'week'
                ? await this.fetchDashboardCompletedTasks({ scope, picker, args })
                : await this.fetchDashboardOpenTasks({ scope, picker, args });

        const details = await this.fetchDashboardTaskDetails({ scope, taskIds: listed.map((task) => task.id) });
        const assigneeGoalIds = new Set(scope.assigneeGoalIds);
        return {
            total,
            tasks: listed.map((task) => ({
                ...task,
                description: details.descriptions.get(task.id) ?? '',
                assigneeEmail: assigneeGoalIds.has(task.goalId) ? (details.emails.get(task.id) ?? null) : null,
            })),
        };
    }

    private async fetchDashboardOpenTasks({
        scope,
        picker,
        args,
    }: FetchDashboardListArgs): Promise<StartDashboardListedPage> {
        const picked = picker.pick(
            await this.repository.fetchDashboardOpenByDeadline({ goalIds: scope.goalIds, ...picker.deadlineRange() })
        );
        return {
            total: picked.length,
            listed: picked.slice(args.offset, args.offset + args.limit).map((task) => ({
                id: task.id,
                goalId: task.goalId,
                daysLate: picker.clock.daysLate(task),
                completedOn: null,
            })),
        };
    }

    private async fetchDashboardCompletedTasks({
        scope,
        picker,
        args,
    }: FetchDashboardListArgs): Promise<StartDashboardListedPage> {
        const range = { goalIds: scope.goalIds, ...picker.completedRange(), limit: args.limit, offset: args.offset };
        const [completed, total] = await Promise.all([
            this.repository.fetchDashboardCompletedPage(range),
            this.repository.countDashboardCompleted(range),
        ]);
        return {
            total,
            listed: completed.map((task) => ({
                id: task.id,
                goalId: task.goalId,
                daysLate: -1,
                completedOn: task.dateComplete ? picker.clock.dayKeyOf(task.dateComplete) : null,
            })),
        };
    }

    // Active projects the caller may see the tasks of; assignees and priorities only where they are visible too
    private async fetchDashboardScope(organizationId?: number): Promise<StartDashboardScope> {
        const access = await this.fetchGoalAccess(organizationId);
        const goalIds = await this.repository.fetchActiveGoalIds(
            access.goalIdsWith(GoalPermissions.COMPONENT_CAN_WATCH_CONTENT)
        );
        const visible = new Set(goalIds);
        return {
            goalIds,
            assigneeGoalIds: access
                .goalIdsWith(GoalPermissions.TASKS_CAN_WATCH_ASSIGNED_USERS)
                .filter((id) => visible.has(id)),
            priorityGoalIds: access
                .goalIdsWith(GoalPermissions.TASKS_CAN_WATCH_PRIORITY)
                .filter((id) => visible.has(id)),
        };
    }

    // Titles of the listed tasks and the first assignee of each, the latter only from projects where assignees are visible
    private async fetchDashboardTaskDetails(args: FetchDashboardTaskDetailsArgs): Promise<StartDashboardAttentionDetails> {
        const { scope, taskIds } = args;
        const [descriptions, assignees] = await Promise.all([
            this.repository.fetchDashboardDescriptions({ goalIds: scope.goalIds, taskIds }),
            this.repository.fetchDashboardTaskAssignees({ goalIds: scope.assigneeGoalIds, taskIds }),
        ]);
        const emails = new Map<number, string>();
        for (const assignee of assignees) {
            if (!emails.has(assignee.taskId)) emails.set(assignee.taskId, assignee.email);
        }
        return {
            descriptions: new Map(descriptions.map((task) => [task.id, task.description ?? ''])),
            emails,
        };
    }

    private async fetchGoalAccess(organizationId?: number): Promise<GoalAccess> {
        const goalIds = await this.user.goalsManager.fetchAccessibleGoalIds({ organizationId });
        return await this.user.permissionsFetcher.getAccessForGoals(goalIds);
    }

    private applyTaskVisibility<T extends StartVisibleTask>(args: StartTasksVisibilityArgs<T>): T[] {
        return args.tasks.map((task) => {
            const checker = args.access.checkerFor(task.goalId);
            if (!checker.hasPermissions(GoalPermissions.TASKS_CAN_WATCH_TAGS)) {
                task.tags = [];
            }
            return hideUnwatchableTaskFields({ task, checker });
        });
    }
}
