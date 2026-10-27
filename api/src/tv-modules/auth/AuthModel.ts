import { and, count, eq, exists, gt, gte, isNotNull, lt, sql } from 'drizzle-orm';
import { AccountDeletionSchema, CollaborationUsersSchema, LoginCodeRequestsSchema, OrganizationMembersSchema, ScimUsersSchema, SsoIdentitiesSchema, UsersSchema } from 'taskview-db-schemas';
import { Database } from '../../modules/db';
import { $logger } from '../../modules/logget';
import type { AddDeleteAccountCodeArgs, ConsumeLoginCodeArgs, DeleteAccountByCodeArgs, ConsumeReminderCodeArgs, LoginCodeAttempt, LoginCodeSendReservation, RegisterUserInDb, ReserveLoginCodeSendArgs, UpdateUserCredentialsArgs, UpdateUserEmailArgs, UpdateUserCredentialsResult, UserDbRecord } from '../../types/auth.types';

export default class AuthModel {
    private readonly db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    async getUserByLogin(login: string, isEmail: boolean = false): Promise<UserDbRecord | false> {
        const field = isEmail ? 'email' : 'login';
        // Login and email are stored lowercase; legacy rows may still hold mixed case, oldest account wins
        const query = isEmail
            ? 'select * from tv_auth.users where lower(email) = $1 order by id limit 1'
            : 'select * from tv_auth.users where lower(login) = $1 order by id limit 1';
        $logger.info({ field }, `[AuthModel:getUserByLogin] field`);
        try {
            const data = await this.db.query<UserDbRecord>(query, [login.toLowerCase()]);

            $logger.info({ login }, `[AuthModel:getUserByLogin] ${query}`);
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

        //remember_token is used as login code; a new code starts with a fresh attempt budget
        try {
            const rows = await this.db.dbDrizzle
                .update(UsersSchema)
                .set({ rememberToken: code, loginCodeAttempts: 0 })
                .where(sql`lower(${UsersSchema.email}) = ${email.toLowerCase()}`)
                .returning({ id: UsersSchema.id });
            return rows.length > 0;
        } catch (error: unknown) {
            $logger.error(error, 'Can not update login code');
            return false;
        }
    }

    /**
     * Counts one guess against the user's current login code before it is compared.
     * The increment is a single UPDATE, so concurrent guesses each get their own attempt number.
     */
    async registerLoginCodeAttempt(userId: number): Promise<LoginCodeAttempt | null> {
        try {
            const [row] = await this.db.dbDrizzle
                .update(UsersSchema)
                .set({ loginCodeAttempts: sql`${UsersSchema.loginCodeAttempts} + 1` })
                .where(and(eq(UsersSchema.id, userId), isNotNull(UsersSchema.rememberToken)))
                .returning({ rememberToken: UsersSchema.rememberToken, attempts: UsersSchema.loginCodeAttempts });
            if (!row?.rememberToken) return null;
            return { rememberToken: row.rememberToken, attempts: row.attempts };
        } catch (error: unknown) {
            $logger.error(error, 'Can not register login code attempt');
            return null;
        }
    }

    /**
     * Records an emailed login code against the hourly cap, or reports when the next one is allowed.
     * The user row is locked for the check-and-insert, so concurrent requests cannot both take the last slot.
     */
    async reserveLoginCodeSend(args: ReserveLoginCodeSendArgs): Promise<LoginCodeSendReservation> {
        return this.db.dbDrizzle.transaction(async (tx) => {
            await tx
                .select({ id: UsersSchema.id })
                .from(UsersSchema)
                .where(eq(UsersSchema.id, args.userId))
                .for('update');

            await tx
                .delete(LoginCodeRequestsSchema)
                .where(lt(LoginCodeRequestsSchema.requestedAt, sql`now() - interval '1 hour'`));

            const [window] = await tx
                .select({
                    sent: count(),
                    retryAfterSeconds: sql<string | null>`ceil(extract(epoch from (min(${LoginCodeRequestsSchema.requestedAt}) + interval '1 hour' - now())))`,
                })
                .from(LoginCodeRequestsSchema)
                .where(eq(LoginCodeRequestsSchema.userId, args.userId));

            if ((window?.sent ?? 0) >= args.hourlyLimit) {
                return { allowed: false, retryAfterSeconds: Math.max(1, Number(window?.retryAfterSeconds ?? 0)) };
            }

            await tx.insert(LoginCodeRequestsSchema).values({ userId: args.userId });
            return { allowed: true };
        });
    }

    /**
     * Clears the login code only if it is still the one that was checked,
     * so two concurrent requests with the right code cannot both log in.
     */
    async consumeLoginCode(args: ConsumeLoginCodeArgs): Promise<boolean> {
        try {
            const rows = await this.db.dbDrizzle
                .update(UsersSchema)
                .set({ rememberToken: null })
                .where(and(eq(UsersSchema.id, args.userId), eq(UsersSchema.rememberToken, args.rememberToken)))
                .returning({ id: UsersSchema.id });
            return rows.length > 0;
        } catch (error: unknown) {
            $logger.error(error, 'Can not consume login code');
            return false;
        }
    }

    async registerUserInDb(data: RegisterUserInDb): Promise<number | false> {
        const { login, email, password, confirmEmailCode, block } = data;
        try {
            const query = `INSERT INTO tv_auth.users (login, email, password, confirm_email_code, block)
                    VALUES ($1, $2, $3, $4, $5) RETURNING id;`;
            const data = await this.db.query<{ id: number }>(query, [
                login.toLowerCase(),
                email.toLowerCase(),
                password,
                confirmEmailCode,
                block,
            ]);

            if (data?.rows && data.rows.length > 0) {
                $logger.debug('User registration success');
                return data.rows[0].id;
            }
            $logger.debug('User registration error');
            return false;
        } catch (error: any) {
            $logger.error({ err: error, login, email }, 'Can not insert user into DB');
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
        const query = 'SELECT * FROM tv_auth.users WHERE lower(email) = $1 ORDER BY id LIMIT 1;';
        try {
            const result = await this.db.query(query, [email.toLowerCase()]);
            if (result.rows.length > 0) {
                return result.rows[0];
            }
            return false;
        } catch (error) {
            console.error('Error fetching user:', error);
            return false;
        }
    }

    async markEmailConfirmed(email: string): Promise<boolean> {
        if (!email) return false;

        try {
            const result = await this.db.dbDrizzle
                .update(UsersSchema)
                .set({ confirmEmailCode: null, block: 0 })
                .where(sql`lower(${UsersSchema.email}) = ${email.toLowerCase()}`);
            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            $logger.error(error, `Error marking email confirmed for ${email}`);
            return false;
        }
    }

    async confirmEmail(login: string, code: string, block: number): Promise<boolean> {
        const query = `UPDATE tv_auth.users 
                   SET confirm_email_code = NULL, block = $1 
                   WHERE lower(login) = $2 AND confirm_email_code = $3`;

        try {
            const result = await this.db.query(query, [block, login.toLowerCase(), code]);
            return !!(result.rowCount && result.rowCount > 0);
        } catch (_error) {
            $logger.error('Error confirming email', { login, code });
            return false;
        }
    }

    /**
     * Clears the password reminder code only if it is still the given, unexpired one.
     * One UPDATE decides, so two concurrent requests with the same code cannot both pass.
     */
    async consumeReminderCode(args: ConsumeReminderCodeArgs): Promise<boolean> {
        try {
            const rows = await this.db.dbDrizzle
                .update(UsersSchema)
                .set({ remindPasswordCode: null, remindPasswordTime: null })
                .where(
                    and(
                        eq(UsersSchema.id, args.userId),
                        eq(UsersSchema.remindPasswordCode, args.code),
                        gte(UsersSchema.remindPasswordTime, args.issuedAfter)
                    )
                )
                .returning({ id: UsersSchema.id });
            return rows.length > 0;
        } catch (error: unknown) {
            $logger.error(error, 'Can not consume password reminder code');
            return false;
        }
    }

    async setReminderCodeAndTime(email: string, code: string | null, time: number | null): Promise<boolean> {
        if (!email) return false;

        let query: string;
        let args: (string | number | null)[];

        if (code === null && time === null) {
            query =
                'UPDATE tv_auth.users SET remind_password_code = NULL, remind_password_time = NULL WHERE lower(email) = $1';
            args = [email.toLowerCase()];
        } else {
            query = 'UPDATE tv_auth.users SET remind_password_code = $1, remind_password_time = $2 WHERE lower(email) = $3';
            args = [code, time, email.toLowerCase()];
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
        const login = args.login.toLowerCase();
        const email = args.email.toLowerCase();
        try {
            await this.db.dbDrizzle.transaction(async (tx) => {
                await tx
                    .update(UsersSchema)
                    .set({ login, email, password: args.passwordHash })
                    .where(eq(UsersSchema.id, args.userId));
                await tx
                    .update(OrganizationMembersSchema)
                    .set({ email })
                    .where(sql`lower(${OrganizationMembersSchema.email}) = ${args.oldEmail.toLowerCase()}`);
                await tx
                    .update(CollaborationUsersSchema)
                    .set({ email })
                    .where(sql`lower(${CollaborationUsersSchema.email}) = ${args.oldEmail.toLowerCase()}`);
                await tx
                    .update(SsoIdentitiesSchema)
                    .set({ email })
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

    async updateUserEmail(args: UpdateUserEmailArgs): Promise<UpdateUserCredentialsResult> {
        const email = args.email.toLowerCase();
        try {
            await this.db.dbDrizzle.transaction(async (tx) => {
                await tx
                    .update(UsersSchema)
                    .set({ email })
                    .where(eq(UsersSchema.id, args.userId));
                await tx
                    .update(OrganizationMembersSchema)
                    .set({ email })
                    .where(sql`lower(${OrganizationMembersSchema.email}) = ${args.oldEmail.toLowerCase()}`);
                await tx
                    .update(CollaborationUsersSchema)
                    .set({ email })
                    .where(sql`lower(${CollaborationUsersSchema.email}) = ${args.oldEmail.toLowerCase()}`);
                await tx
                    .update(ScimUsersSchema)
                    .set({ memberEmail: email })
                    .where(sql`lower(${ScimUsersSchema.memberEmail}) = ${args.oldEmail.toLowerCase()}`);
                await tx
                    .update(SsoIdentitiesSchema)
                    .set({ email })
                    .where(eq(SsoIdentitiesSchema.userId, args.userId));
            });
            return 'ok';
        } catch (error) {
            const pgCode = (error as { code?: string })?.code ?? (error as { cause?: { code?: string } })?.cause?.code;
            if (pgCode === '23505') {
                return 'conflict';
            }
            $logger.error(error, `Can not update email for user ${args.userId}`);
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

    async addDeleteAccountCode(args: AddDeleteAccountCodeArgs): Promise<boolean> {
        try {
            return await this.db.dbDrizzle.transaction(async (tx) => {
                await tx.delete(AccountDeletionSchema).where(eq(AccountDeletionSchema.userId, args.userId));
                const rows = await tx
                    .insert(AccountDeletionSchema)
                    .values({ userId: args.userId, code: args.code })
                    .returning({ id: AccountDeletionSchema.id });
                return rows.length > 0;
            });
        } catch (error: unknown) {
            $logger.error(error, 'Can not save account deletion code');
            return false;
        }
    }

    async deleteAccountByCode(args: DeleteAccountByCodeArgs): Promise<boolean> {
        try {
            const validCode = this.db.dbDrizzle
                .select({ id: AccountDeletionSchema.id })
                .from(AccountDeletionSchema)
                .where(
                    and(
                        eq(AccountDeletionSchema.userId, args.userId),
                        eq(AccountDeletionSchema.code, args.code),
                        gt(AccountDeletionSchema.createdAt, sql`now() - make_interval(secs => ${args.ttlSeconds})`)
                    )
                );
            const rows = await this.db.dbDrizzle
                .delete(UsersSchema)
                .where(and(eq(UsersSchema.id, args.userId), exists(validCode)))
                .returning({ id: UsersSchema.id });
            return rows.length > 0;
        } catch (error: unknown) {
            $logger.error(error, 'Can not delete user account');
            return false;
        }
    }
}
