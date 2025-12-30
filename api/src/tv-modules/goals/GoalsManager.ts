import type { AppUser } from '../../core/AppUser';
import { GoalPermissionsFetcher } from '../../core/GoalPermissionsFetcher';
import type { AddGoalToDbArg, GoalItemInDb, UpdateGoalDbArg } from '../../types/goal.type';
import { isNotNullable } from '../../utils/helpers';
import { GoalItemForClient } from './GoalItemForClient';
import { GoalsRepository } from './GoalsRepository';
import type { GoalsArgAdd, GoalsArgDelete, GoalsArgUpdate, GoalsItemForClientWithPermissions } from './types';

export default class GoalsManager {
    public readonly goalsRepository: GoalsRepository;
    private readonly user: AppUser;

    constructor(user: AppUser) {
        this.user = user;
        this.goalsRepository = new GoalsRepository();
    }

    async getPermissionsForGoal(goalId: number) {
        return await this.user.permissionsFetcher.getPermissionsForType(
            goalId,
            GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL
        );
    }

    /** @deprecated */
    async fetchGoals(): Promise<GoalItemForClient[]> {
        const goals = await this.goalsRepository.fetchGoalsForUser(this.user);

        if (goals.length === 0) {
            return [];
        }

        const permChecker = await this.user.permissionsFetcher.getPermissionsForType(
            goals[0].id,
            GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL
        );

        return goals.map((goal) => new GoalItemForClient(goal, permChecker.getAllPermissions()));
    }

    async addGoal(goalData: AddGoalToDbArg): Promise<GoalItemForClient | false> {
        const goal = await this.goalsRepository.addGoal(goalData);

        if (!goal) {
            return false;
        }

        return new GoalItemForClient(goal, (await this.getPermissionsForGoal(goal.id)).getAllPermissions());
    }

    async updateGoal(data: UpdateGoalDbArg) {
        const update = await this.goalsRepository.updateGoal(data);

        if (!update) {
            return false;
        }

        const goal = await this.goalsRepository.fetchGoalById(data.id);
        if (!goal) {
            return false;
        }

        return new GoalItemForClient(goal, (await this.getPermissionsForGoal(goal.id)).getAllPermissions());
    }

    /** @deprecated use deleteGoalNew instead */
    async deleteGoal(goalId: number): Promise<boolean> {
        return await this.goalsRepository.deleteGoal(goalId);
    }

    /** @deprecated use fetchSharedGoalsForUser from GoalsRepository instead */
    async fetchSharedGoals() {
        const goals = await this.goalsRepository.fetchSharedGoals(this.user);
        return await Promise.all(
            goals.map(
                async (g) =>
                    new GoalItemForClient(
                        g,
                        (
                            await this.user.permissionsFetcher.getPermissionsForType(
                                g.id,
                                GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL
                            )
                        ).getAllPermissions()
                    )
            )
        );
    }

    async updateArchive(goalId: number, archive: GoalItemInDb['archive']) {
        return await this.goalsRepository.updateArchive(goalId, archive);
    }

    async fetchAllOwnGoalsIds() {
        return await this.goalsRepository.fetchAllOwnGoalsIds(this.user);
    }

    async createGoal(goalData: GoalsArgAdd): Promise<GoalsItemForClientWithPermissions | false> {
        const userId = this.user.getUserData()?.id;
        if (!isNotNullable(userId)) {
            return false;
        }
        const goal = await this.goalsRepository.createGoal(goalData, userId);
        if (!goal) {
            return false;
        }
        return {
            ...goal,
            permissions: (
                await this.user.permissionsFetcher.getPermissionsForType(
                    goal.id,
                    GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL
                )
            ).getAllPermissions(),
        };
    }

    async updateGoalNew(goalData: GoalsArgUpdate): Promise<GoalsItemForClientWithPermissions | false> {
        const goal = await this.goalsRepository.updateGoalNew(goalData);

        if (!goal) {
            return false;
        }

        return {
            ...goal,
            //TODO wrap permissionsFetcher.getPermissionsForType to getPermissionsForGoal or something like that to make it more readable
            permissions: (
                await this.user.permissionsFetcher.getPermissionsForType(
                    goal.id,
                    GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL
                )
            ).getAllPermissions(),
        };
    }

    async deleteGoalNew(goalData: GoalsArgDelete) {
        return await this.goalsRepository.deleteGoalNew(goalData);
    }

    async fetchGoalsNew(): Promise<GoalsItemForClientWithPermissions[]> {
        const sharedGoals = await this.goalsRepository.fetchSharedGoalsForUser(this.user!);
        const ownGoals = await this.goalsRepository.fetchGoalsNew(this.user.getUserData()?.id!);

        let ownGoalsWithPermissions: GoalsItemForClientWithPermissions[] = [];
        let sharedGoalsWithPermissions: GoalsItemForClientWithPermissions[] = [];

        if (ownGoals.length > 0) {
            const permChecker = await this.user.permissionsFetcher.getPermissionsForType(
                ownGoals[0].id,
                GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL
            );
            ownGoalsWithPermissions = ownGoals.map((g) => ({ ...g, permissions: permChecker.getAllPermissions() }));
        }

        if (sharedGoals.length > 0) {
            sharedGoalsWithPermissions = await Promise.all(
                sharedGoals.map(async (g) => {
                    return {
                        ...g,
                        permissions: (
                            await this.user.permissionsFetcher.getPermissionsForType(
                                g.id,
                                GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL
                            )
                        ).getAllPermissions(),
                    };
                })
            );
        }

        return [...ownGoalsWithPermissions, ...sharedGoalsWithPermissions];
    }
}
