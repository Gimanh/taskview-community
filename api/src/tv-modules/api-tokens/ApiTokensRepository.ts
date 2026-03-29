import { and, eq } from 'drizzle-orm';
import { ApiTokensSchema, type ApiTokensSchemaTypeForSelect } from 'taskview-db-schemas';
import { Database } from '../../modules/db';
import { callWithCatch } from '../../utils/helpers';

export class ApiTokensRepository {
    private readonly db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    async create(data: { userId: number; name: string; tokenHash: string; allowedPermissions: string[]; allowedGoalIds: number[]; expiresAt: Date | null }): Promise<ApiTokensSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.insert(ApiTokensSchema).values(data).returning()
        );
        return result?.[0] ?? null;
    }

    async delete(id: number, userId: number): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.delete(ApiTokensSchema).where(
                and(eq(ApiTokensSchema.id, id), eq(ApiTokensSchema.userId, userId))
            )
        );
        return !!result?.rowCount;
    }

    async fetchByUserId(userId: number): Promise<ApiTokensSchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(ApiTokensSchema).where(eq(ApiTokensSchema.userId, userId))
        );
        return result ?? [];
    }

    async findByTokenHash(tokenHash: string): Promise<ApiTokensSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(ApiTokensSchema).where(eq(ApiTokensSchema.tokenHash, tokenHash))
        );
        return result?.[0] ?? null;
    }

    async updateLastUsedAt(id: number): Promise<void> {
        await callWithCatch(() =>
            this.db.dbDrizzle.update(ApiTokensSchema)
                .set({ lastUsedAt: new Date() })
                .where(eq(ApiTokensSchema.id, id))
        );
    }
}
