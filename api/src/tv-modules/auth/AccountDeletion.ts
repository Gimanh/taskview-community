/**
 * Whether people may delete their own account. Off unless ALLOW_ACCOUNT_DELETION=true:
 * on a company install accounts are removed by an admin, not by their owners.
 */
export class AccountDeletion {
    /** How long an emailed account deletion code works. */
    static readonly CODE_TTL_S = 15 * 60;

    static allowed(): boolean {
        return process.env.ALLOW_ACCOUNT_DELETION?.trim().toLowerCase() === 'true';
    }

    static validateOnStartup(): void {
        const raw = process.env.ALLOW_ACCOUNT_DELETION;
        if (raw === undefined || raw.trim() === '') return;

        const normalized = raw.trim().toLowerCase();
        if (normalized !== 'true' && normalized !== 'false') {
            throw new Error(`ALLOW_ACCOUNT_DELETION has unrecognized value "${raw}". Allowed: true, false`);
        }
    }
}
