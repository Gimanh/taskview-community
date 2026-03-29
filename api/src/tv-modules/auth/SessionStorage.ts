import { and, eq, ne } from 'drizzle-orm'
import { UserTokensSchema } from 'taskview-db-schemas'
import { Database } from '../../modules/db'
import { callWithCatch, parseDeviceName } from '../../utils/helpers'

export default class SessionStorage {
  private readonly db: Database

  constructor() {
    this.db = Database.getInstance()
  }

  async createSession(userId: number, ip: string | undefined, userAgent: string | undefined): Promise<number | false> {
    const deviceName = parseDeviceName(userAgent)
    const result = await callWithCatch(() =>
      this.db.dbDrizzle.insert(UserTokensSchema).values({
        userId,
        userIp: ip || null,
        deviceName,
        userAgent: userAgent || null,
        lastUsedAt: new Date(),
      }).returning({ id: UserTokensSchema.id })
    )
    return result?.[0]?.id ?? false
  }

  async isSessionActive(sessionId: number): Promise<boolean> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle.select({ id: UserTokensSchema.id })
        .from(UserTokensSchema)
        .where(eq(UserTokensSchema.id, sessionId))
    )
    return !!(result && result.length > 0)
  }

  async updateLastUsed(sessionId: number): Promise<void> {
    await callWithCatch(() =>
      this.db.dbDrizzle.update(UserTokensSchema)
        .set({ lastUsedAt: new Date() })
        .where(eq(UserTokensSchema.id, sessionId))
    )
  }

  async deleteSession(sessionId: number, userId: number): Promise<boolean> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle.delete(UserTokensSchema)
        .where(and(eq(UserTokensSchema.id, sessionId), eq(UserTokensSchema.userId, userId)))
    )
    return !!result?.rowCount
  }

  async deleteAllSessions(userId: number, excludeSessionId?: number): Promise<boolean> {
    if (excludeSessionId) {
      const result = await callWithCatch(() =>
        this.db.dbDrizzle.delete(UserTokensSchema)
          .where(and(
            eq(UserTokensSchema.userId, userId),
            ne(UserTokensSchema.id, excludeSessionId)
          ))
      )
      return !!result
    }

    const result = await callWithCatch(() =>
      this.db.dbDrizzle.delete(UserTokensSchema)
        .where(eq(UserTokensSchema.userId, userId))
    )
    return !!result
  }

  async fetchUserSessions(userId: number) {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle.select()
        .from(UserTokensSchema)
        .where(eq(UserTokensSchema.userId, userId))
        .orderBy(UserTokensSchema.lastUsedAt)
    )
    return result ?? []
  }
}
