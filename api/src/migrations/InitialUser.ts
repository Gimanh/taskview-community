import { hashSync } from 'bcryptjs';
import type { CreateInitialUserArgs, InitialUserPasswordCheck } from './initial-user.types';

/**
 * The account a fresh installation starts with. Its password comes from the
 * environment, so no credentials are shared between installations.
 */
export class InitialUser {
    static readonly ENV_NAME = 'INITIAL_USER_PASSWORD';
    static readonly LOGIN = 'user';
    static readonly EMAIL = 'test@mail.dest';
    static readonly PASSWORD_MIN_LENGTH = 6;
    static readonly PASSWORD_MAX_LENGTH = 128;

    static checkPassword(raw: string | undefined): InitialUserPasswordCheck {
        if (raw === undefined || raw === '') return { status: 'missing' };

        if (raw !== raw.trim()) {
            return { status: 'invalid', reason: `${InitialUser.ENV_NAME} must not start or end with whitespace` };
        }
        if (raw.length < InitialUser.PASSWORD_MIN_LENGTH || raw.length > InitialUser.PASSWORD_MAX_LENGTH) {
            return {
                status: 'invalid',
                reason: `${InitialUser.ENV_NAME} must be ${InitialUser.PASSWORD_MIN_LENGTH} to ${InitialUser.PASSWORD_MAX_LENGTH} characters long`,
            };
        }
        return { status: 'ok', password: raw };
    }

    static async create(args: CreateInitialUserArgs): Promise<void> {
        await args.client.query(
            `INSERT INTO tv_auth.users (login, email, password, block, confirm_email_code, remind_password_code, remember_token)
             VALUES ($1, $2, $3, 0, null, null, null);`,
            [InitialUser.LOGIN, InitialUser.EMAIL, hashSync(args.password, 10)]
        );
    }
}
