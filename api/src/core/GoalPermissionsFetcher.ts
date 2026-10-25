import type { GoalPermissionItemsFromDb, GoalPermissionType, PermissionsEntityType } from '../types/auth.types';
import type { AppUser } from './AppUser';
import { GoalAccess } from './GoalAccess';
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

        return (await this.getAccessForGoals([goalId])).checkerFor(goalId);
    }

    /**
     * The single place where a user's goal permissions are resolved: owner or role
     * permissions, dropped for goals outside the token's allowedGoalIds and
     * intersected with the token's permissions.
     */
    async getAccessForGoals(goalIds: number[]): Promise<GoalAccess> {
        const checkers = new Map<number, GoalPermissionsChecker>();
        const userData = this.user.getUserData();
        if (!userData) return new GoalAccess(checkers);

        const allowedGoalIds = this.user.getAllowedGoalIds();
        const scopedGoalIds = [...new Set(goalIds)].filter(
            (id) => !allowedGoalIds || allowedGoalIds.length === 0 || allowedGoalIds.includes(id)
        );
        const uncachedGoalIds = scopedGoalIds.filter((id) => !this.isCacheValid(id));

        if (uncachedGoalIds.length > 0) {
            const rows = await this.goalPermissionsRepository.fetchPermissionsForGoals({
                goalIds: uncachedGoalIds,
                userId: userData.id,
                email: userData.email,
            });
            const tokenPerms = this.user.getTokenPermissions();
            const permissionsByGoal = new Map<number, GoalPermissionItemsFromDb>(uncachedGoalIds.map((id) => [id, []]));

            rows.forEach((row) => {
                if (tokenPerms && tokenPerms.length > 0 && !tokenPerms.includes(row.permissionName)) return;
                permissionsByGoal.get(row.goalId)?.push({ permissionName: row.permissionName, permissionId: row.permissionId });
            });

            permissionsByGoal.forEach((permissions, goalId) => {
                this.checkerCache[goalId] = {
                    checker: new GoalPermissionsChecker(permissions),
                    timestamp: performance.now(),
                };
            });
        }

        scopedGoalIds.forEach((id) => checkers.set(id, this.checkerCache[id].checker));
        return new GoalAccess(checkers);
    }

    /**
     * Whether the caller may see data that belongs to no goal (e.g. legacy tags):
     * a token restricted to goals may not, and a token's permissions still apply.
     */
    canSeeDataOutsideGoals(permission: GoalPermissionType): boolean {
        const allowedGoalIds = this.user.getAllowedGoalIds();
        if (allowedGoalIds && allowedGoalIds.length > 0) return false;

        const tokenPerms = this.user.getTokenPermissions();
        return !tokenPerms || tokenPerms.length === 0 || tokenPerms.includes(permission);
    }

    async getCheckerForGoal(goalId: number): Promise<GoalPermissionsChecker> {
        return await this.getPermissionsForType(goalId, GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL);
    }

    async getAccessibleGoalIds(organizationId: number, permissions: string[]): Promise<number[]> {
        if (permissions.length === 0) return [];

        const tokenPerms = this.user.getTokenPermissions();
        const effectivePermissions = tokenPerms && tokenPerms.length > 0
            ? permissions.filter((p) => tokenPerms.includes(p))
            : permissions;

        if (effectivePermissions.length === 0) return [];

        const userData = this.user.getUserData();
        if (!userData) return [];

        let goalIds = await this.goalPermissionsRepository.fetchGoalIdsWithAnyPermission({
            userId: userData.id,
            email: userData.email,
            organizationId,
            permissionNames: effectivePermissions,
        });

        const allowedGoalIds = this.user.getAllowedGoalIds();
        if (allowedGoalIds && allowedGoalIds.length > 0) {
            goalIds = goalIds.filter((id) => allowedGoalIds.includes(id));
        }

        return goalIds;
    }
}
