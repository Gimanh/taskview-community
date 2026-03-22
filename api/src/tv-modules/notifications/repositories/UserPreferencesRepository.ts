import { eq } from 'drizzle-orm';
import { NotificationPreferencesSchema } from 'taskview-db-schemas';
import { Database } from '../../../modules/db';
import { callWithCatch } from '../../../utils/helpers';
import { UserPreferences } from '../UserPreferences';
import type { NotificationChannel, NotificationType } from '../types';

export class UserPreferencesRepository {
    private readonly db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    async load(userId: number): Promise<UserPreferences> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select({ settings: NotificationPreferencesSchema.settings })
                .from(NotificationPreferencesSchema)
                .where(eq(NotificationPreferencesSchema.userId, userId))
                .limit(1)
        );
        return new UserPreferences(result?.[0]?.settings);
    }

    async save(userId: number, preferences: UserPreferences): Promise<boolean> {
        const settings = preferences.toJSON();
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.insert(NotificationPreferencesSchema)
                .values({ userId, settings })
                .onConflictDoUpdate({
                    target: [NotificationPreferencesSchema.userId],
                    set: { settings },
                })
        );
        return !!result;
    }

    async getEnabledChannels(userId: number, type: NotificationType, goalId?: number): Promise<NotificationChannel[]> {
        const prefs = await this.load(userId);
        return prefs.getEnabledChannels(type, goalId);
    }
}
