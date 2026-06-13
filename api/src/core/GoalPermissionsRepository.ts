import { and, eq, exists, inArray, or } from 'drizzle-orm';
import {
    CollaborationPermissionsToRoleSchema,
    CollaborationRolesSchema,
    CollaborationUsersSchema,
    CollaborationUsersToGoalsSchema,
    CollaborationUsersToRolesSchema,
    GoalsSchema,
    PermissionsSchema,
} from 'taskview-db-schemas';
import { Database } from '../modules/db';
import type { FetchGoalIdsWithAnyPermissionParams, FetchPermissionsForGoalByUserParams, GoalPermissionItemsFromDb } from '../types/auth.types';
import type { GoalItemInDb } from '../types/goal.type';
import type { ListItemInDb } from '../types/lists.types';
import type { TaskItemInDb } from '../types/tasks.types';
import type { AppUser } from './AppUser';

export class GoalPermissionsRepository {
    private db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    async getGoalIdForList(listId: number): Promise<ListItemInDb['goal_id'] | null> {
        const result = await this.db.query<ListItemInDb>('select goal_id from tasks.goal_lists where id = $1', [
            listId,
        ]);
        if (result.rows.length > 0) {
            return result.rows[0].goal_id;
        }
        return null;
    }

    async fetchPermissionsForGoal(goalId: number, user: AppUser): Promise<GoalPermissionItemsFromDb> {
        const userData = user.getUserData();
        if (!userData) return [];
        return this.fetchPermissionsForGoalByUser({ goalId, userId: userData.id, email: userData.email });
    }

    /**
     * Permission set of an arbitrary user for a goal, without an AppUser/request
     * context — used by background workers (e.g. deadline notifications) that
     * must gate content per recipient.
     */
    async fetchPermissionsForGoalByUser(params: FetchPermissionsForGoalByUserParams): Promise<GoalPermissionItemsFromDb> {
        const goalInfo = await this.db.query<GoalItemInDb>('select * from tasks.goals where id = $1', [params.goalId]);

        if (goalInfo.rows.length === 0) {
            return [];
        }

        let query = '';
        let args: any = [];

        if (goalInfo.rows[0].owner === params.userId) {
            query = `select name as "permissionName", id as "permissionId" from tv_auth.permissions;`;
        } else {
            query = `select p.name as "permissionName", p.id as "permissionId"
                        from collaboration.users cu
                                left join collaboration.users_to_goals utg on cu.id = utg.user_id
                                left join tasks.goals tg on utg.goal_id = tg.id
                                left join collaboration.users_to_roles utr on utr.user_id = cu.id
                                left join collaboration.roles rol on utr.role_id = rol.id and rol.goal_id = tg.id
                                left join collaboration.permissions_to_role ptr on rol.id = ptr.role_id
                                left join tv_auth.permissions p on ptr.permission_id = p.id
                        where email = $1 and tg.id = $2 and p.name is not null and p.id is not null;`;
            args = [params.email, params.goalId];
        }

        const result = await this.db.query<GoalPermissionItemsFromDb[number]>(query, args);

        return result.rows;
    }

    async getGoalIdForTask(taskId: number): Promise<TaskItemInDb['goal_id'] | null> {
        const result = await this.db.query<TaskItemInDb>('select goal_id from tasks.tasks where id = $1', [taskId]);
        if (result.rows.length > 0) {
            return result.rows[0].goal_id;
        }
        return null;
    }

    async fetchGoalIdsWithAnyPermission(params: FetchGoalIdsWithAnyPermissionParams): Promise<number[]> {
        if (params.permissionNames.length === 0) return [];

        const permissionSubquery = this.db.dbDrizzle
            .select({ one: CollaborationUsersSchema.id })
            .from(CollaborationUsersSchema)
            .innerJoin(
                CollaborationUsersToGoalsSchema,
                and(
                    eq(CollaborationUsersToGoalsSchema.userId, CollaborationUsersSchema.id),
                    eq(CollaborationUsersToGoalsSchema.goalId, GoalsSchema.id),
                ),
            )
            .innerJoin(
                CollaborationUsersToRolesSchema,
                eq(CollaborationUsersToRolesSchema.userId, CollaborationUsersSchema.id),
            )
            .innerJoin(
                CollaborationRolesSchema,
                and(
                    eq(CollaborationRolesSchema.id, CollaborationUsersToRolesSchema.roleId),
                    eq(CollaborationRolesSchema.goalId, GoalsSchema.id),
                ),
            )
            .innerJoin(
                CollaborationPermissionsToRoleSchema,
                eq(CollaborationPermissionsToRoleSchema.roleId, CollaborationRolesSchema.id),
            )
            .innerJoin(
                PermissionsSchema,
                eq(PermissionsSchema.id, CollaborationPermissionsToRoleSchema.permissionId),
            )
            .where(
                and(
                    eq(CollaborationUsersSchema.email, params.email),
                    inArray(PermissionsSchema.name, params.permissionNames),
                ),
            );

        const result = await this.db.dbDrizzle
            .select({ id: GoalsSchema.id })
            .from(GoalsSchema)
            .where(
                and(
                    eq(GoalsSchema.organizationId, params.organizationId),
                    eq(GoalsSchema.archive, 0),
                    or(eq(GoalsSchema.owner, params.userId), exists(permissionSubquery)),
                ),
            );

        return result.map((r) => r.id).filter((id): id is number => Number.isInteger(id));
    }
}
