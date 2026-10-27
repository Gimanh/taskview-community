import type { AppUser } from '../../core/AppUser';
import type { GoalAccess } from '../../core/GoalAccess';
import { GoalPermissions } from '../../types/auth.types';
import { hideUnwatchableTaskFields } from '../tasks/task-field-visibility';
import { StartRepository } from './StartRepository';
import type { StartTasksVisibilityArgs, StartVisibleTask } from './start.types';

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

        const users = await this.repository.fetchUsersByProjects(access.goalIdsWith(GoalPermissions.GOAL_CAN_MANAGE_USERS));
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
