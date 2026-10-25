import type { GoalPermissionType } from '../types/auth.types';
import { GoalPermissionsChecker } from './GoalPermissionsChecker';

/** Effective, token-aware permissions of the current user over a set of goals. */
export class GoalAccess {
    private readonly checkers: Map<number, GoalPermissionsChecker>;

    constructor(checkers: Map<number, GoalPermissionsChecker>) {
        this.checkers = checkers;
    }

    checkerFor(goalId: number): GoalPermissionsChecker {
        return this.checkers.get(goalId) ?? new GoalPermissionsChecker([]);
    }

    goalIdsWith(permission: GoalPermissionType): number[] {
        return [...this.checkers]
            .filter(([, checker]) => checker.hasPermissions(permission))
            .map(([goalId]) => goalId);
    }
}
