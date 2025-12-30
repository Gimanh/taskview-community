import { and, eq, inArray } from 'drizzle-orm';
import {
    CollaborationUsersSchema,
    type CollaborationUsersSchemaTypeForSelect,
    CollaborationUsersToGoalsSchema,
    CollaborationUsersToRolesSchema,
} from 'taskview-db-schemas';
import { Database } from '../../modules/db';
import { $logger } from '../../modules/logget';
import { logError } from '../../utils/api';
import { callWithCatch } from '../../utils/helpers';
import type {
    CollaborationArgAddUser,
    CollaborationArgDeleteUser,
    CollaborationArgToggleUserRoles,
} from './collaboration.server.types';
import type { CollaborationUserInDb, DeleteUserArg, FetchUsersForGoal } from './collaboration.types';

export class CollaborationRepository {
    private readonly db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    async fetchAllUsers(goalIds: number[]): Promise<FetchUsersForGoal[] | false> {
        if (goalIds.length === 0) {
            return [];
        }

        const placeholders = goalIds.map((_v, index) => `$${index + 1}`).join(',');
        const query = `
          SELECT u.*, u.invitation_date::text, utr.role_id, utg.goal_id
          FROM collaboration.users u
          left join collaboration.users_to_goals utg on u.id = utg.user_id
          LEFT JOIN collaboration.users_to_roles utr ON u.id = utr.user_id
          WHERE utg.goal_id IN (${placeholders})
        `;

        const result = await this.db.query<FetchUsersForGoal>(query, goalIds).catch(logError);

        if (!result) {
            return false;
        }

        return result.rows;
    }

    async hasUser(email: string): Promise<false | number> {
        const result = await this.db
            .query<CollaborationUserInDb>('select * from collaboration.users where email = $1', [email])
            .catch(logError);

        if (!result) {
            return false;
        }

        return result.rows.length > 0 ? result.rows[0].id : false;
    }

    async addUserForCollaboration(goalId: number, email: string): Promise<number | false> {
        const has = await this.hasUser(email);
        let userId: number;
        if (has === false) {
            const result = await this.db
                .query(`INSERT INTO collaboration.users (email) VALUES ($1) RETURNING id`, [email])
                .catch(logError);
            if (!result) {
                return false;
            }
            userId = result.rows[0]?.id;
        } else {
            userId = has;
        }

        await this.db
            .query(`insert into collaboration.users_to_goals (goal_id, user_id) values ($1, $2)`, [goalId, userId])
            .catch(logError);

        return userId ?? false;
    }

    async fetchRecordById(id: number): Promise<CollaborationUserInDb | false> {
        const query = `SELECT * FROM collaboration.users WHERE id = $1`;

        const result = await this.db.query(query, [id]).catch(logError);
        if (!result) {
            return false;
        }

        return result.rows[0];
    }

    
    async fetchUsersForGoal(goalId: number): Promise<FetchUsersForGoal[] | false> {
        const query = `
          SELECT u.*, u.invitation_date::text, utr.role_id, utg.goal_id
          FROM collaboration.users u
          left join collaboration.users_to_goals utg on u.id = utg.user_id
          LEFT JOIN collaboration.users_to_roles utr ON u.id = utr.user_id
          WHERE utg.goal_id = $1
        `;
        const values = [goalId];

        const result = await this.db.query<FetchUsersForGoal>(query, values).catch(logError);

        if (!result) {
            return false;
        }

        return result.rows;
    }

    async fetchUsersForGoals(goalIds: number[]): Promise<FetchUsersForGoal[] | false> {
        if (goalIds.length === 0) {
            return [];
        }
        const query = `
          SELECT u.*, u.invitation_date::text, utr.role_id, utg.goal_id
          FROM collaboration.users u
          left join collaboration.users_to_goals utg on u.id = utg.user_id
          LEFT JOIN collaboration.users_to_roles utr ON u.id = utr.user_id
          WHERE utg.goal_id IN (${goalIds.map((_v, i) => `$${i + 1}`).join(',')})
        `;
        const values = [...goalIds];

        const result = await this.db.query<FetchUsersForGoal>(query, values).catch(logError);

        if (!result) {
            return false;
        }

        return result.rows;
    }

    async deleteUser(args: DeleteUserArg) {
        const query = `DELETE FROM collaboration.users_to_goals WHERE user_id = $1 AND goal_id = $2`;

        const result = await this.db.query(query, [args.id, args.goalId]).catch(logError);

        if (!result) {
            return false;
        }

        return !!(result.rowCount && result.rowCount > 0);
    }

    async updateUserRoles(userId: number, roles: number[]): Promise<number[] | false> {
        const deleteQuery = `DELETE FROM collaboration.users_to_roles WHERE user_id = $1`;
        let i = 1;
        const insertQuery = `INSERT INTO collaboration.users_to_roles (user_id, role_id) VALUES ${roles.map(() => `($${i++}, $${i++})`).join(', ')}`;
        const result = await this.db.query(deleteQuery, [userId]).catch(logError);

        if (!result) {
            return false;
        }

        if (roles.length === 0) {
            return [];
        }

        const values: number[] = [];

        roles.forEach((roleId) => {
            values.push(userId, roleId);
        });

        const insertResult = await this.db.query(insertQuery, values).catch(logError);

        if (!insertResult) {
            return false;
        }

        return roles;
    }

    async fetchGoalOwnerEmail(goalId: number): Promise<string | false> {
        const result = await this.db
            .query<{ email: string }>(
                `select u.email from tasks.goals g 
                                            left join tv_auth.users u on u.id = g."owner" 
                                            where g.id = $1`,
                [goalId]
            )
            .catch(logError);
        if (!result) {
            return false;
        }

        if (result.rows.length === 0) {
            $logger.error(`Can not fing owner for goalId ${goalId}`);
            return false;
        }

        return result.rows[0].email;
    }

    async addUserForCollaborationNew(
        args: CollaborationArgAddUser
    ): Promise<CollaborationUsersSchemaTypeForSelect | null> {
        const user = await callWithCatch(() =>
            this.db.dbDrizzle.transaction(async (tx) => {
                let userId: number;
                let user: CollaborationUsersSchemaTypeForSelect;

                const existingUser = await tx
                    .select()
                    .from(CollaborationUsersSchema)
                    .where(eq(CollaborationUsersSchema.email, args.email));

                if (existingUser.length > 0) {
                    userId = existingUser[0].id;
                    user = existingUser[0];
                } else {
                    const [userTransaction] = await tx.insert(CollaborationUsersSchema).values(args).returning();
                    userId = userTransaction.id;
                    user = userTransaction;
                }

                await tx.insert(CollaborationUsersToGoalsSchema).values({
                    userId: userId,
                    goalId: args.goalId,
                });

                return user;
            })
        );

        if (!user) return null;

        return user;
    }

    async deleteUserNew(args: CollaborationArgDeleteUser) {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .delete(CollaborationUsersToGoalsSchema)
                .where(
                    and(
                        eq(CollaborationUsersToGoalsSchema.userId, args.id),
                        eq(CollaborationUsersToGoalsSchema.goalId, args.goalId)
                    )
                )
                .returning()
        );

        return !!(result && result.length > 0);
    }

    async toggleUserRolesNew(args: CollaborationArgToggleUserRoles): Promise<number[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.transaction(async (tx) => {
                await tx
                    .delete(CollaborationUsersToRolesSchema)
                    .where(eq(CollaborationUsersToRolesSchema.userId, args.userId));
                if (args.roles.length > 0) {
                    return await tx
                        .insert(CollaborationUsersToRolesSchema)
                        .values(args.roles.map((roleId) => ({ userId: args.userId, roleId })))
                        .returning();
                }
                return [];
            })
        );

        if (!result) {
            return [];
        }

        return result.map((role) => role.roleId);
    }

    async fetchAllUsersNew(goalIds: number[]) {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({
                    id: CollaborationUsersSchema.id,
                    email: CollaborationUsersSchema.email,
                    roleId: CollaborationUsersToRolesSchema.roleId,
                    goalId: CollaborationUsersToGoalsSchema.goalId,
                    invitationDate: CollaborationUsersSchema.invitationDate,
                })
                .from(CollaborationUsersSchema)
                .leftJoin(
                    CollaborationUsersToGoalsSchema,
                    eq(CollaborationUsersSchema.id, CollaborationUsersToGoalsSchema.userId)
                )
                .leftJoin(
                    CollaborationUsersToRolesSchema,
                    eq(CollaborationUsersSchema.id, CollaborationUsersToRolesSchema.userId)
                )
                .where(inArray(CollaborationUsersToGoalsSchema.goalId, goalIds))
        );
        return result;
    }

    async fetchUsersForGoalNew(goalId: number) {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({
                    id: CollaborationUsersSchema.id,
                    email: CollaborationUsersSchema.email,
                    roleId: CollaborationUsersToRolesSchema.roleId,
                    goalId: CollaborationUsersToGoalsSchema.goalId,
                    invitationDate: CollaborationUsersSchema.invitationDate,
                })
                .from(CollaborationUsersSchema)
                .leftJoin(
                    CollaborationUsersToGoalsSchema,
                    eq(CollaborationUsersSchema.id, CollaborationUsersToGoalsSchema.userId)
                )
                .leftJoin(
                    CollaborationUsersToRolesSchema,
                    eq(CollaborationUsersSchema.id, CollaborationUsersToRolesSchema.userId)
                )
                .where(eq(CollaborationUsersToGoalsSchema.goalId, goalId))
        );
        return result;
    }

    async userExistInGoal(userId: number, goalId: number): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(CollaborationUsersToGoalsSchema)
                .where(
                    and(
                        eq(CollaborationUsersToGoalsSchema.userId, userId),
                        eq(CollaborationUsersToGoalsSchema.goalId, goalId)
                    )
                )
        );
        return !!result && result.length > 0;
    }
}
