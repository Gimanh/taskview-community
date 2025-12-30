import type { PermissionsEntityType } from '../types/auth.types';
import type { AppUser } from './AppUser';
import { GoalPermissionsChecker } from './GoalPermissionsChecker';
import { GoalPermissionsRepository } from './GoalPermissionsRepository';

export class GoalPermissionsFetcher {
    static readonly PERMISSION_TYPE_FOR_GOAL = 1;
    static readonly PERMISSION_TYPE_FOR_TASKLIST = 2;
    static readonly PERMISSION_TYPE_FOR_TASK = 3;
    private readonly goalPermissionsRepository: GoalPermissionsRepository;
    private readonly user: AppUser;
    private checkerCache: Record<number, { checker: GoalPermissionsChecker; timestamp: number }> = {};
    private cacheTimeout: number = 1000 * 60;

    constructor(appUser: AppUser) {
        this.user = appUser;
        this.goalPermissionsRepository = new GoalPermissionsRepository();
    }

    private isCacheValid(goalId: number): boolean {
        const cached = this.checkerCache[goalId];
        return cached && performance.now() - cached.timestamp < this.cacheTimeout;
    }

    async getPermissionsForType(entityId: number, type: PermissionsEntityType): Promise<GoalPermissionsChecker> {
        let goalId: number | null = null;

        switch (type) {
            case GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL:
                goalId = entityId;
                break;
            case GoalPermissionsFetcher.PERMISSION_TYPE_FOR_TASK:
                goalId = await this.goalPermissionsRepository.getGoalIdForTask(entityId);
                break;
            case GoalPermissionsFetcher.PERMISSION_TYPE_FOR_TASKLIST:
                goalId = await this.goalPermissionsRepository.getGoalIdForList(entityId);
                break;
        }

        if (!goalId) { return new GoalPermissionsChecker([]); }

        if (this.isCacheValid(goalId)) {
            return this.checkerCache[goalId].checker;
        }

        this.checkerCache[goalId] = {
            checker: new GoalPermissionsChecker(
                await this.goalPermissionsRepository.fetchPermissionsForGoal(goalId, this.user)
            ),
            timestamp: performance.now(),
        };

        return this.checkerCache[goalId].checker;
    }

    async getCheckerForGoal(goalId: number): Promise<GoalPermissionsChecker> {
        return await this.getPermissionsForType(goalId, GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL);
    }
}
