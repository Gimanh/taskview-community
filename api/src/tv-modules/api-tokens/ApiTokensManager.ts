import { randomBytes, createHash } from 'crypto';
import { ApiTokensRepository } from './ApiTokensRepository';
import { TOKEN_PREFIX, type ApiTokenArgCreate } from './types';
import type { ApiTokensSchemaTypeForSelect } from 'taskview-db-schemas';

export type ApiTokenForClient = Omit<ApiTokensSchemaTypeForSelect, 'tokenHash'>;

export class ApiTokensManager {
    public readonly repository: ApiTokensRepository;

    constructor() {
        this.repository = new ApiTokensRepository();
    }

    async create(userId: number, data: ApiTokenArgCreate): Promise<{ token: string; item: ApiTokenForClient } | null> {
        const raw = randomBytes(32).toString('hex');
        const fullToken = TOKEN_PREFIX + raw;
        const tokenHash = createHash('sha256').update(fullToken).digest('hex');

        const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

        const record = await this.repository.create({
            userId,
            name: data.name,
            tokenHash,
            allowedPermissions: data.allowedPermissions ?? [],
            allowedGoalIds: data.allowedGoalIds ?? [],
            expiresAt,
        });

        if (!record) return null;

        return { token: fullToken, item: this.toClient(record) };
    }

    async delete(id: number, userId: number): Promise<boolean> {
        return this.repository.delete(id, userId);
    }

    async fetchAll(userId: number): Promise<ApiTokenForClient[]> {
        const tokens = await this.repository.fetchByUserId(userId);
        return tokens.map((t) => this.toClient(t));
    }

    async validateToken(fullToken: string): Promise<ApiTokensSchemaTypeForSelect | null> {
        const tokenHash = createHash('sha256').update(fullToken).digest('hex');
        const record = await this.repository.findByTokenHash(tokenHash);

        if (!record) return null;
        if (record.expiresAt && record.expiresAt < new Date()) return null;

        this.repository.updateLastUsedAt(record.id).catch(() => {});

        return record;
    }

    private toClient(token: ApiTokensSchemaTypeForSelect): ApiTokenForClient {
        const { tokenHash, ...rest } = token;
        return rest;
    }
}

let _instance: ApiTokensManager | null = null;

export function getApiTokensManager(): ApiTokensManager {
    if (!_instance) _instance = new ApiTokensManager();
    return _instance;
}
