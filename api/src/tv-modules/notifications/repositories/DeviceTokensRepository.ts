import { and, eq, ne } from 'drizzle-orm';
import { DeviceTokensSchema, type DeviceTokensSchemaTypeForSelect } from 'taskview-db-schemas';
import { Database } from '../../../modules/db';
import { callWithCatch } from '../../../utils/helpers';

export class DeviceTokensRepository {
    private readonly db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    async register(userId: number, token: string, platform: string, timezone: string): Promise<boolean> {
        await callWithCatch(() =>
            this.db.dbDrizzle.delete(DeviceTokensSchema)
                .where(and(
                    eq(DeviceTokensSchema.token, token),
                    ne(DeviceTokensSchema.userId, userId),
                ))
        );

        const result = await callWithCatch(() =>
            this.db.dbDrizzle.insert(DeviceTokensSchema).values({
                userId,
                token,
                platform,
                timezone,
            }).onConflictDoUpdate({
                target: [DeviceTokensSchema.userId, DeviceTokensSchema.token],
                set: { timezone },
            })
        );
        return !!result;
    }

    async unregister(userId: number, token: string): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.delete(DeviceTokensSchema)
                .where(and(
                    eq(DeviceTokensSchema.userId, userId),
                    eq(DeviceTokensSchema.token, token),
                ))
        );
        return !!result;
    }

    async getByUserId(userId: number): Promise<DeviceTokensSchemaTypeForSelect[]> {
        return await callWithCatch(() =>
            this.db.dbDrizzle.select()
                .from(DeviceTokensSchema)
                .where(eq(DeviceTokensSchema.userId, userId))
        ) || [];
    }

    async getTimezoneByUserId(userId: number): Promise<string> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select({ timezone: DeviceTokensSchema.timezone })
                .from(DeviceTokensSchema)
                .where(eq(DeviceTokensSchema.userId, userId))
                .limit(1)
        );
        return result?.[0]?.timezone || 'UTC';
    }

    async deleteByToken(token: string): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.delete(DeviceTokensSchema)
                .where(eq(DeviceTokensSchema.token, token))
        );
        return !!result;
    }
}
