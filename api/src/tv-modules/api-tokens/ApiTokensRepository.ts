import { and, asc, eq, isNull, ne } from 'drizzle-orm';
import {
    ApiTokensSchema,
    PermissionsSchema,
    type ApiTokensSchemaTypeForSelect,
    type PermissionsSchemaTypeForSelect,
} from 'taskview-db-schemas';
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
                and(eq(ApiTokensSchema.id, id), eq(ApiTokensSchema.userId, userId), isNull(ApiTokensSchema.grantId))
            )
        );
        return !!result?.rowCount;
    }

    /**
     * Only manually issued tokens. OAuth access tokens live in the same table but
     * belong to a grant - they are listed and revoked as connected apps instead.
     */
    async fetchByUserId(userId: number): Promise<ApiTokensSchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(ApiTokensSchema).where(
                and(eq(ApiTokensSchema.userId, userId), isNull(ApiTokensSchema.grantId))
            )
        );
        return result ?? [];
    }

    async findByTokenHash(tokenHash: string): Promise<ApiTokensSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(ApiTokensSchema).where(eq(ApiTokensSchema.tokenHash, tokenHash))
        );
        return result?.[0] ?? null;
    }

    /**
     * Permissions offered when scoping a token. Group 1 is excluded: those keys
     * exist in the table but are enforced nowhere in the code, so offering them
     * would promise a restriction that never happens.
     */
    async fetchSelectablePermissions(): Promise<PermissionsSchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select()
                .from(PermissionsSchema)
                .where(ne(PermissionsSchema.permissionGroup, 1))
                .orderBy(asc(PermissionsSchema.permissionGroup), asc(PermissionsSchema.id))
        );
        return result ?? [];
    }

    async updateLastUsedAt(id: number): Promise<void> {
        await callWithCatch(() =>
            this.db.dbDrizzle.update(ApiTokensSchema)
                .set({ lastUsedAt: new Date() })
                .where(eq(ApiTokensSchema.id, id))
        );
    }
}
