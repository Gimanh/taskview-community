import { eq, sql } from 'drizzle-orm'
import { UiPreferencesSchema } from 'taskview-db-schemas'
import { Database } from '../../modules/db'
import { callWithCatch } from '../../utils/helpers'
import type { UiPreferences, UpdateUiPreferencesArgs } from './types'

export class UiPreferencesRepository {
  private readonly db: Database

  constructor() {
    this.db = Database.getInstance()
  }

  async getForUser(userId: number): Promise<UiPreferences> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .select({ prefs: UiPreferencesSchema.prefs })
        .from(UiPreferencesSchema)
        .where(eq(UiPreferencesSchema.userId, userId)),
    )
    if (!result || result.length === 0) return {}
    return (result[0].prefs ?? {}) as UiPreferences
  }

  async upsert(args: UpdateUiPreferencesArgs): Promise<UiPreferences> {
    const { userId, prefs } = args
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .insert(UiPreferencesSchema)
        .values({ userId, prefs, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: UiPreferencesSchema.userId,
          set: { prefs, updatedAt: sql`now()` },
        })
        .returning({ prefs: UiPreferencesSchema.prefs }),
    )
    if (!result || result.length === 0) return prefs
    return (result[0].prefs ?? {}) as UiPreferences
  }
}
