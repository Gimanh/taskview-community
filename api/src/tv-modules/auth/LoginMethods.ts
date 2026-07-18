import type { LoginMethod } from '../../types/auth.types';

export class LoginMethods {
    static readonly ALL: LoginMethod[] = ['magic-link', 'password', 'sso', 'social'];

    static enabled(): Set<LoginMethod> {
        const raw = process.env.AUTH_LOGIN_METHODS;
        if (!raw || !raw.trim()) {
            return new Set(LoginMethods.ALL);
        }
        return new Set(LoginMethods.parse(raw).valid);
    }

    static isEnabled(method: LoginMethod): boolean {
        return LoginMethods.enabled().has(method);
    }

    static publicRegistrationAllowed(): boolean {
        return process.env.ALLOW_PUBLIC_REGISTRATION?.trim().toLowerCase() !== 'false';
    }

    static validateOnStartup(): void {
        const registrationRaw = process.env.ALLOW_PUBLIC_REGISTRATION;
        if (registrationRaw !== undefined && registrationRaw.trim() !== '') {
            const normalized = registrationRaw.trim().toLowerCase();
            if (normalized !== 'true' && normalized !== 'false') {
                throw new Error(
                    `ALLOW_PUBLIC_REGISTRATION has unrecognized value "${registrationRaw}". Allowed: true, false`
                );
            }
        }

        const raw = process.env.AUTH_LOGIN_METHODS;
        if (!raw || !raw.trim()) return;

        const { valid, invalid } = LoginMethods.parse(raw);
        if (invalid.length > 0) {
            throw new Error(
                `AUTH_LOGIN_METHODS contains unknown values: ${invalid.join(', ')}. Allowed: ${LoginMethods.ALL.join(', ')}`
            );
        }
        if (valid.length === 0) {
            throw new Error('AUTH_LOGIN_METHODS disables every login method — nobody would be able to sign in');
        }
    }

    static configuredSocialProviders(): string[] {
        const providers: string[] = [];
        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
            providers.push('google');
        }
        if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && process.env.GITHUB_CALLBACK_URL) {
            providers.push('github');
        }
        if (
            process.env.APPLE_CLIENT_ID &&
            process.env.APPLE_TEAM_ID &&
            process.env.APPLE_KEY_ID &&
            process.env.APPLE_CALLBACK_URL &&
            process.env.APPLE_KEY_LOCATION
        ) {
            providers.push('apple');
        }
        return providers;
    }

    static availableSocialProviders(): string[] {
        return LoginMethods.isEnabled('social') ? LoginMethods.configuredSocialProviders() : [];
    }

    private static parse(raw: string): { valid: LoginMethod[]; invalid: string[] } {
        const values = raw
            .split(',')
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean);
        const valid = values.filter((value): value is LoginMethod => (LoginMethods.ALL as string[]).includes(value));
        const invalid = values.filter((value) => !(LoginMethods.ALL as string[]).includes(value));
        return { valid, invalid };
    }
}
