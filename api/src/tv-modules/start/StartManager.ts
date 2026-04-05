import type { AppUser } from '../../core/AppUser';
import { $logger } from '../../modules/logget';
import { GoalPermissions } from '../../types/auth.types';
import { logError } from '../../utils/api';
import type { GoalItemForClient } from '../goals/GoalItemForClient';
import { StartRepository } from './StartRepository';

export class StartManager {
    public readonly user: AppUser;
    public readonly repository: StartRepository;
    private sharedGoals: GoalItemForClient[] = [];

    constructor(user: AppUser) {
        this.user = user;
        this.repository = new StartRepository(this.user);
    }

    async fetchAllLists(organizationId?: number) {
        return await this.repository.fetchAllLists(this.user, organizationId);
    }

    async fetchAllState(tz: string, organizationId?: number) {
        await this.fetchSharedGoals(organizationId);
        const goalIds = await this.getAllGoalsIds(organizationId);
        const usersAndProjects = await this.fetchProjectsAndUsers(organizationId);
        const tasks = await this.repository.fetchAllActiveTasksForGoals(goalIds, usersAndProjects.assignees);
        const tasksToday = await this.repository.fetchAllTodayTasksForGoals(goalIds, tz, usersAndProjects.assignees);
        const tasksUpcoming = await this.repository.fetchUpcomingTasksForGoals(goalIds, tz, usersAndProjects.assignees);
        const tasksLastCompleted = await this.repository.fetchLastCompletedTasksForGoals(
            goalIds,
            usersAndProjects.assignees
        );
        return {
            tasks,
            tasksToday,
            tasksUpcoming,
            tasksLastCompleted,
            users: usersAndProjects.users,
            assignees: usersAndProjects.assignees,
        };
    }

    async fetchSharedGoals(organizationId?: number) {
        this.sharedGoals = await this.user.goalsManager.fetchSharedGoals(organizationId);
    }

    async getAllGoalsIds(organizationId?: number) {
        const ownGoalIds = await this.user.goalsManager.fetchAllOwnGoalsIds(organizationId);

        const sharedGoalIds: number[] = [];
        this.sharedGoals.forEach((g) => {
            if (g.hasPermissions(GoalPermissions.GOAL_CAN_WATCH_CONTENT)) {
                sharedGoalIds.push(g.id);
            }
        });

        const ids = new Set([...ownGoalIds, ...sharedGoalIds]);
        return [...ids];
    }

    async fetchProjectsAndUsers(organizationId?: number) {
        const ownGoalIds = await this.user.goalsManager.fetchAllOwnGoalsIds(organizationId)

        const goalsIdsForUsers: number[] = [...ownGoalIds]
        const goalsIdsForAssignee: number[] = [...ownGoalIds]

        this.sharedGoals.forEach((goal) => {
            if (goal.hasPermissions(GoalPermissions.GOAL_CAN_MANAGE_USERS)) {
                goalsIdsForUsers.push(goal.id)
            }

            if (goal.hasPermissions(GoalPermissions.TASKS_CAN_WATCH_ASSIGNED_USERS)) {
                goalsIdsForAssignee.push(goal.id)
            }
        })

        const users = await this.repository.fetchUsersByProjects(goalsIdsForUsers)
        const assignees = await this.repository.fetchAssigneesForTasks(goalsIdsForAssignee)

        return {
            users,
            assignees,
        }
    }

    async searchTaskInAllProjects(description?: string, organizationId?: number) {
        if (!description) return [];

        await this.fetchSharedGoals(organizationId);
        const goalIds = await this.getAllGoalsIds(organizationId);

        const tasks = await this.repository.searchTask(description.trim(), goalIds);
        return tasks;
    }
}
