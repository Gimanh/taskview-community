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
        this.repository = new StartRepository();
    }

    async fetchAllLists() {
        return await this.repository.fetchAllLists(this.user);
    }

    async fetchAllState(tz: string) {
        await this.fetchSharedGoals();
        const goalIds = await this.getAllGoalsIds();
        const usersAndProjects = await this.fetchProjectsAndUsers();
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

    async fetchSharedGoals() {
        this.sharedGoals = await this.user.goalsManager.fetchSharedGoals();
    }

    async getAllGoalsIds() {
        const ownGoals = await this.repository.db
            .query<{ id: number }>('select id from tasks.goals where owner = $1 and archive = $2', [
                this.user.getUserData()?.id,
                0,
            ])
            .catch(logError);

        if (!ownGoals) {
            $logger.error(`Can not fetch own goals for all state`);
        }

        const ids: number[] = [];

        this.sharedGoals.forEach((g) => {
            if (g.hasPermissions(GoalPermissions.GOAL_CAN_WATCH_CONTENT)) {
                ids.push(g.id);
            }
        });

        if (ownGoals) {
            ownGoals.rows.forEach((g) => {
                ids.push(g.id);
            });
        }

        return ids;
    }

    async fetchProjectsAndUsers() {
        const goalsIdsForUsers: number[] = [];
        const goalsIdsForAssignee: number[] = [];

        this.sharedGoals.forEach((goal) => {
            if (goal.hasPermissions(GoalPermissions.GOAL_CAN_MANAGE_USERS)) {
                goalsIdsForUsers.push(goal.id);
            }

            if (goal.hasPermissions(GoalPermissions.TASKS_CAN_WATCH_ASSIGNED_USERS)) {
                goalsIdsForAssignee.push(goal.id);
            }
        }, []);

        const users = await this.repository.fetchUsersByProjects(this.user.getUserData()?.id!, goalsIdsForUsers);
        const assignees = await this.repository.fetchAssigneesForTasks(
            this.user.getUserData()?.id!,
            goalsIdsForAssignee
        );

        return {
            users,
            assignees,
        };
    }

    async searchTaskInAllProjects(description?: string) {
        if (!description) return [];

        await this.fetchSharedGoals();
        const goalIds = await this.getAllGoalsIds();

        const tasks = await this.repository.searchTask(description.trim(), goalIds);
        return tasks;
    }
}
