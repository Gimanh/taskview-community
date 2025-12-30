import { and, eq, not } from 'drizzle-orm';
import type { CollaborationRolesSchemaTypeForSelect, PermissionsSchemaTypeForSelect } from 'taskview-db-schemas';
import { CollaborationPermissionsToRoleSchema, CollaborationRolesSchema, PermissionsSchema } from 'taskview-db-schemas';
import { Database } from '../../modules/db';
import { logError } from '../../utils/api';
import { callWithCatch } from '../../utils/helpers';
import type { CollaborationArgDeleteRoleFromGoal } from '../collaboration/collaboration.server.types';
import type { PermissionInDb, PermissionToRoleInDb, RoleInDb } from './collaboration-roles.types';

export class CollaborationRolesRepository {
    private readonly db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    async addRole(roleName: string, goalId: number): Promise<false | number> {
        const query = 'INSERT INTO collaboration.roles (name, goal_id) VALUES ($1, $2) RETURNING id';
        const values = [roleName, goalId];
        const result = await this.db.query(query, values).catch(logError);
        return result?.rows[0]?.id || false;
    }

    async addRoleNew(roleName: string, goalId: number): Promise<CollaborationRolesSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.insert(CollaborationRolesSchema).values({ name: roleName, goalId }).returning()
        );
        return result?.[0] ?? null;
    }

    async fetchRecordById(id: number): Promise<RoleInDb | false> {
        const query = 'SELECT * FROM collaboration.roles WHERE id = $1';
        const values = [id];
        const result = await this.db.query<RoleInDb>(query, values).catch(logError);
        return result?.rows[0] || false;
    }

    async fetchRolesForGoal(goalId: number): Promise<RoleInDb[] | false> {
        const query = 'SELECT * FROM collaboration.roles WHERE goal_id = $1';
        const values = [goalId];
        const result = await this.db.query<RoleInDb>(query, values).catch(logError);
        if (!result) {
            return false;
        }
        return result.rows;
    }

    async fetchRolesForGoalNew(goalId: number): Promise<CollaborationRolesSchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(CollaborationRolesSchema).where(eq(CollaborationRolesSchema.goalId, goalId))
        );
        return result ?? [];
    }

    async deleteRole(id: number): Promise<boolean> {
        const query = 'DELETE FROM collaboration.roles WHERE id = $1';
        const values = [id];
        const result = await this.db.query(query, values);
        return !!(result.rowCount && result.rowCount > 0);
    }

    async deleteRoleNew(id: CollaborationArgDeleteRoleFromGoal): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .delete(CollaborationRolesSchema)
                .where(and(eq(CollaborationRolesSchema.id, id.id), eq(CollaborationRolesSchema.goalId, id.goalId)))
                .returning()
        );
        return !!(result && result.length > 0);
    }

    async fetchAllAvailablePermissionsNew(): Promise<PermissionsSchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(PermissionsSchema)
                .where(not(eq(PermissionsSchema.permissionGroup, 1)))
        );
        return result ?? [];
    }

    async fetchAllAvailablePermissions(): Promise<PermissionInDb[] | false> {
        const query = 'SELECT * FROM tv_auth.permissions WHERE permission_group <> $1';
        const values = [1];
        const result = await this.db.query<PermissionInDb>(query, values).catch(logError);

        if (!result) {
            return false;
        }
        return result.rows;
    }

    /**
     * We fetch all roles with permissions for creating map
     * @param goalId
     * @returns
     */
    async fetchAllRolesPermissionsForGoal(goalId: number): Promise<PermissionToRoleInDb[] | false> {
        const query = `SELECT ptr.*
                       FROM collaboration.roles r
                       LEFT JOIN collaboration.permissions_to_role ptr ON r.id = ptr.role_id
                       WHERE goal_id = $1 AND permission_id IS NOT NULL`;
        const values = [goalId];
        const result = await this.db.query<PermissionToRoleInDb>(query, values).catch(logError);
        if (!result) {
            return false;
        }
        return result.rows;
    }

    async fetchRoleToPermissionsForGoalNew(
        goalId: number
    ): Promise<{ roleId: number | null; permissionId: number | null }[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({
                    roleId: CollaborationRolesSchema.id,
                    permissionId: CollaborationPermissionsToRoleSchema.permissionId,
                })
                .from(CollaborationRolesSchema)
                .leftJoin(
                    CollaborationPermissionsToRoleSchema,
                    eq(CollaborationRolesSchema.id, CollaborationPermissionsToRoleSchema.roleId)
                )
                .where(eq(CollaborationRolesSchema.goalId, goalId))
        );
        return result ?? [];
    }

    /**
     * @deprecated use toggleRolePermissionNew instead
     * @param roleId
     * @param permissionId
     * @returns
     */
    async toggleRolePermission(roleId: number, permissionId: number): Promise<boolean> {
        const checkQuery = 'SELECT * FROM collaboration.permissions_to_role WHERE role_id = $1 AND permission_id = $2';
        const deleteQuery = 'DELETE FROM collaboration.permissions_to_role WHERE role_id = $1 AND permission_id = $2';
        const insertQuery = 'INSERT INTO collaboration.permissions_to_role (role_id, permission_id) VALUES ($1, $2)';
        const values = [roleId, permissionId];

        const hasPermission = await this.db.query(checkQuery, values).catch(logError);

        if (!hasPermission) {
            throw new Error('Can not check permissions');
        }

        if (hasPermission.rows.length > 0) {
            const deleteResult = await this.db.query(deleteQuery, values);
            if (deleteResult.rowCount && deleteResult.rowCount > 0) {
                return false;
            }
        } else {
            const insertResult = await this.db.query(insertQuery, values);
            if (insertResult.rowCount && insertResult.rowCount > 0) {
                return true;
            }
        }

        throw new Error('Toggle error');
    }

    async toggleRolePermissionNew(roleId: number, permissionId: number): Promise<boolean | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.transaction(async (tx) => {
                const hasPermission = await tx
                    .select()
                    .from(CollaborationPermissionsToRoleSchema)
                    .where(
                        and(
                            eq(CollaborationPermissionsToRoleSchema.roleId, roleId),
                            eq(CollaborationPermissionsToRoleSchema.permissionId, permissionId)
                        )
                    );

                if (hasPermission.length > 0) {
                    await tx
                        .delete(CollaborationPermissionsToRoleSchema)
                        .where(
                            and(
                                eq(CollaborationPermissionsToRoleSchema.roleId, roleId),
                                eq(CollaborationPermissionsToRoleSchema.permissionId, permissionId)
                            )
                        );
                    return false;
                } else {
                    await tx.insert(CollaborationPermissionsToRoleSchema).values({ roleId, permissionId });
                    return true;
                }
            })
        );

        return result;
    }
}
