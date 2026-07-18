import { eq, sql } from 'drizzle-orm';
import { CollaborationUsersSchema, OrganizationMembersSchema, SsoIdentitiesSchema, UsersSchema } from 'taskview-db-schemas';
import { Database } from '../../modules/db';
import { $logger } from '../../modules/logget';
import type { RegisterUserInDb, UpdateUserCredentialsArgs, UpdateUserCredentialsResult, UserDbRecord } from '../../types/auth.types';

export default class AuthModel {
    private readonly db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    async getUserByLogin(login: string, isEmail: boolean = false): Promise<UserDbRecord | false> {
        const field = isEmail ? 'email' : 'login';
        $logger.info({ field }, `[AuthModel:getUserByLogin] field`);
        try {
            const data = await this.db.query<UserDbRecord>(`select * from tv_auth.users where ${field} = $1`, [login]);

            $logger.info({ login }, `[AuthModel:getUserByLogin] select * from tv_auth.users where ${field} = $1`);
            $logger.info(data, `[AuthModel:getUserByLogin] data`);

            if (data.rows && data.rows.length > 0) {
                return data.rows[0];
            }
        } catch (error: any) {
            $logger.error(error);
            $logger.warn(`Can not find user by login ${login}`);
            return false;
        }
        $logger.info(`[AuthModel:getUserByLogin] no user by login`);
        return false;
    }

    async updateLoginCode(code: string | null, email: string): Promise<boolean> {
        if (!email) return false;

        //remember_token is used as login code
        try {
            const data = await this.db.query(`update tv_auth.users set remember_token = $1 where email = $2`, [
                code,
                email,
            ]);
            return !!(data.rowCount && data.rowCount > 0);
        } catch (error: unknown) {
            $logger.error(error, 'Can not update login code');
            return false;
        }

        return true;
    }

    async registerUserInDb(data: RegisterUserInDb): Promise<number | false> {
        const { login, email, password, confirmEmailCode, block } = data;
        try {
            const query = `INSERT INTO tv_auth.users (login, email, password, confirm_email_code, block)
                    VALUES ($1, $2, $3, $4, $5) RETURNING id;`;
            const data = await this.db.query<{ id: number }>(query, [login, email, password, confirmEmailCode, block]);

            if (data?.rows && data.rows.length > 0) {
                $logger.debug('User registration success');
                return data.rows[0].id;
            }
            $logger.debug('User registration error');
            return false;
        } catch (_error: any) {
            $logger.error('Can not inser user into DB');
            return false;
        }
    }

    async isEmailInvited(email: string): Promise<boolean> {
        const normalized = email.toLowerCase();
        try {
            const orgMembers = await this.db.dbDrizzle
                .select({ email: OrganizationMembersSchema.email })
                .from(OrganizationMembersSchema)
                .where(sql`lower(${OrganizationMembersSchema.email}) = ${normalized}`)
                .limit(1);
            if (orgMembers.length > 0) return true;

            const collaborators = await this.db.dbDrizzle
                .select({ email: CollaborationUsersSchema.email })
                .from(CollaborationUsersSchema)
                .where(sql`lower(${CollaborationUsersSchema.email}) = ${normalized}`)
                .limit(1);
            return collaborators.length > 0;
        } catch (error: unknown) {
            $logger.error(error, '[AuthModel:isEmailInvited] failed to check invitations');
            return false;
        }
    }

    async fetchUserById(id: number): Promise<UserDbRecord | false> {
        const query = 'SELECT * FROM tv_auth.users WHERE id = $1;';
        try {
            const result = await this.db.query(query, [id]);
            if (result.rows.length > 0) {
                return result.rows[0];
            }
            return false;
        } catch (error) {
            console.error('Error fetching user:', error);
            return false;
        }
    }

    async fetchUserByEmail(email: string): Promise<UserDbRecord | false> {
        const query = 'SELECT * FROM tv_auth.users WHERE email = $1;';
        try {
            const result = await this.db.query(query, [email]);
            if (result.rows.length > 0) {
                return result.rows[0];
            }
            return false;
        } catch (error) {
            console.error('Error fetching user:', error);
            return false;
        }
    }

    async confirmEmail(login: string, code: string, block: number): Promise<boolean> {
        const query = `UPDATE tv_auth.users 
                   SET confirm_email_code = NULL, block = $1 
                   WHERE login = $2 AND confirm_email_code = $3`;

        try {
            const result = await this.db.query(query, [block, login, code]);
            return !!(result.rowCount && result.rowCount > 0);
        } catch (_error) {
            $logger.error('Error confirming email', { login, code });
            return false;
        }
    }

    async setReminderCodeAndTime(email: string, code: string | null, time: number | null): Promise<boolean> {
        if (!email) return false;

        let query: string;
        let args: (string | number | null)[];

        if (code === null && time === null) {
            query =
                'UPDATE tv_auth.users SET remind_password_code = NULL, remind_password_time = NULL WHERE email = $1';
            args = [email];
        } else {
            query = 'UPDATE tv_auth.users SET remind_password_code = $1, remind_password_time = $2 WHERE email = $3';
            args = [code, time, email];
        }

        try {
            const result = await this.db.query(query, args);
            return !!(result.rowCount && result.rowCount > 0);
        } catch (_error) {
            $logger.error('Error setting reminder code and time', { email, code, time });
            return false;
        }
    }

    async updateUserCredentials(args: UpdateUserCredentialsArgs): Promise<UpdateUserCredentialsResult> {
        try {
            await this.db.dbDrizzle.transaction(async (tx) => {
                await tx
                    .update(UsersSchema)
                    .set({ login: args.login, email: args.email, password: args.passwordHash })
                    .where(eq(UsersSchema.id, args.userId));
                await tx
                    .update(OrganizationMembersSchema)
                    .set({ email: args.email })
                    .where(eq(OrganizationMembersSchema.email, args.oldEmail));
                await tx
                    .update(CollaborationUsersSchema)
                    .set({ email: args.email })
                    .where(eq(CollaborationUsersSchema.email, args.oldEmail));
                await tx
                    .update(SsoIdentitiesSchema)
                    .set({ email: args.email })
                    .where(eq(SsoIdentitiesSchema.userId, args.userId));
            });
            return 'ok';
        } catch (error) {
            // unique(organization_id, email): the new email is already an invited member of one of the user's orgs
            const pgCode = (error as { code?: string })?.code ?? (error as { cause?: { code?: string } })?.cause?.code;
            if (pgCode === '23505') {
                return 'conflict';
            }
            $logger.error(error, `Can not update credentials for user ${args.userId}`);
            return 'error';
        }
    }

    async updateUserPassword(password: string, userId: number): Promise<boolean> {
        try {
            const query = 'UPDATE tv_auth.users SET password = $1 WHERE id = $2';
            const result = await this.db.query(query, [password, userId]);
            return !!(result.rowCount && result.rowCount > 0);
        } catch (_error: any) {
            $logger.error(`Can not update user password for user ${userId}`);
            return false;
        }
    }

    async clearAllSessionTokensForUser(userId: number): Promise<boolean> {
        try {
            const query = 'delete from tv_auth.user_tokens where user_id = $1';
            const result = await this.db.query(query, [userId]);
            return !!result.rowCount;
        } catch (error: any) {
            $logger.error(`Can not delete ${userId}`, { errorMessage: error.message, errorStack: error.stack });
            return false;
        }
    }

    async addDeleteAccountCode(code: string, userId: number): Promise<boolean> {
        try {
            const queryDeleteOldData = 'delete from tv_auth.account_deletion where user_id = $1';
            await this.db.query(queryDeleteOldData, [userId]);
            const insertQuery = 'insert into tv_auth.account_deletion (code, user_id) values ($1,$2)';
            const insertResult = await this.db.query(insertQuery, [code, userId]);
            return !!(insertResult.rowCount && insertResult.rowCount > 0);
        } catch (error: any) {
            $logger.error(`Can can not complete delete code for account ${userId}`, {
                errorMessage: error.message,
                errorStack: error.stack,
            });
            return false;
        }
    }

    async deleteUserAccount(code: string, userId: number): Promise<boolean> {
        try {
            const query = 'select user_id from tv_auth.account_deletion where code = $1';
            const codeData = await this.db.query(query, [code]);
            if (codeData.rows.length > 0 && userId === codeData.rows[0]['user_id']) {
                const deleteUser = await this.db.query('delete from tv_auth.users where id = $1', [
                    codeData.rows[0]['user_id'],
                ]);
                return !!(deleteUser.rowCount && deleteUser.rowCount > 0);
            } else {
                $logger.error(`Can not fetch user account for code ${code}`);
            }
        } catch (_err: any) {
            $logger.error(`Can not delete user account for code ${code}`);
            return false;
        }
        return false;
    }
}
