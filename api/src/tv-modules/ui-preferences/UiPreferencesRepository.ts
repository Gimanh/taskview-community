import { eq, sql } from 'drizzle-orm'
import { UiPreferencesSchema } from 'taskview-db-schemas'
import { Database } from '../../modules/db'
import { callWithCatch } from '../../utils/helpers'
import { MAX_RECENT_PROJECTS, UI_SETTINGS_KEY, type MarkProjectUsedArgs, type UiPreferences, type UiSettings, type UpdateUiPreferencesArgs } from './types'

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

  async markProjectUsed(args: MarkProjectUsedArgs): Promise<number[] | null> {
    const { userId, projectId } = args
    return callWithCatch(() =>
      this.db.dbDrizzle.transaction(async (tx) => {
        const [row] = await tx
          .select({ prefs: UiPreferencesSchema.prefs })
          .from(UiPreferencesSchema)
          .where(eq(UiPreferencesSchema.userId, userId))
          .for('update')
        const prefs = (row?.prefs ?? {}) as UiPreferences
        const settings = (prefs[UI_SETTINGS_KEY] ?? {}) as UiSettings
        const previous = settings.recentProjectIds ?? []
        if (previous[0] === projectId) return previous
        const recentProjectIds = [projectId, ...previous.filter((id) => id !== projectId)].slice(0, MAX_RECENT_PROJECTS)
        const next = { ...prefs, [UI_SETTINGS_KEY]: { ...settings, recentProjectIds } }
        await tx
          .insert(UiPreferencesSchema)
          .values({ userId, prefs: next, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: UiPreferencesSchema.userId,
            set: { prefs: next, updatedAt: sql`now()` },
          })
        return recentProjectIds
      }),
    )
  }
}
