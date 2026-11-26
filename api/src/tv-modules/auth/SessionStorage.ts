import { createHash } from 'crypto'
import { and, eq, gt, ne, sql } from 'drizzle-orm'
import { UserTokensSchema } from 'taskview-db-schemas'
import { Database } from '../../modules/db'
import type {
  CreateSessionArgs,
  CsrfTokenCheck,
  RefreshRotationResult,
  RotateRefreshTokenArgs,
  VerifyCsrfTokenArgs,
} from '../../types/auth.types'
import { safeEqual } from '../../utils/crypto'
import { callWithCatch, parseDeviceName, parsePositiveInt } from '../../utils/helpers'

const DEFAULT_SESSION_MAX_AGE_DAYS = 90
// Two tabs or a retried request may present the same refresh token almost at once
const REFRESH_REPEAT_GRACE_SECONDS = 30

export default class SessionStorage {
  private readonly db: Database

  /** A session ends this many days after sign-in, however often its tokens are refreshed. */
  static maxAgeDays(): number {
    return parsePositiveInt(process.env.SESSION_MAX_AGE_DAYS) ?? DEFAULT_SESSION_MAX_AGE_DAYS
  }

  static validateOnStartup(): void {
    const raw = process.env.SESSION_MAX_AGE_DAYS
    if (raw !== undefined && raw.trim() !== '' && parsePositiveInt(raw) === null) {
      throw new Error(`SESSION_MAX_AGE_DAYS has unrecognized value "${raw}". Expected a positive integer`)
    }
  }

  private notExpired() {
    return gt(UserTokensSchema.timeCreation, sql`now() - make_interval(days => ${SessionStorage.maxAgeDays()})`)
  }

  constructor() {
    this.db = Database.getInstance()
  }

  async createSession(args: CreateSessionArgs): Promise<number | false> {
    const deviceName = parseDeviceName(args.userAgent)
    const result = await callWithCatch(() =>
      this.db.dbDrizzle.insert(UserTokensSchema).values({
        userId: args.userId,
        userIp: args.ip || null,
        deviceName,
        userAgent: args.userAgent || null,
        lastUsedAt: new Date(),
        refreshJti: args.refreshJti,
        csrfTokenHash: this.hashCsrfToken(args.csrfToken),
      }).returning({ id: UserTokensSchema.id })
    )
    return result?.[0]?.id ?? false
  }

  private hashCsrfToken(csrfToken: string): string {
    return createHash('sha256').update(csrfToken).digest('hex')
  }

  /**
   * Compares the presented CSRF token with the one the session was opened with.
   * Throws when the database fails, so a failure is not answered as a wrong token.
   */
  async verifyCsrfToken(args: VerifyCsrfTokenArgs): Promise<CsrfTokenCheck> {
    const [session] = await this.db.dbDrizzle
      .select({ csrfTokenHash: UserTokensSchema.csrfTokenHash })
      .from(UserTokensSchema)
      .where(and(eq(UserTokensSchema.id, args.sessionId), this.notExpired()))
    if (!session) return 'inactive'
    if (!session.csrfTokenHash || !args.csrfToken) return 'invalid'
    return safeEqual(this.hashCsrfToken(args.csrfToken), session.csrfTokenHash) ? 'valid' : 'invalid'
  }

  /**
   * Swaps the session's refresh token id for the next one, provided the presented id is
   * the current one. The swap is one conditional UPDATE, so of two parallel requests with
   * the same token exactly one rotates and the other is answered as a repeat.
   * Throws when the database fails: the caller must not mistake that for a leaked token.
   */
  async rotateRefreshToken(args: RotateRefreshTokenArgs): Promise<RefreshRotationResult> {
    const rotated = await this.db.dbDrizzle.update(UserTokensSchema)
      .set({
        prevRefreshJti: sql`${UserTokensSchema.refreshJti}`,
        refreshJti: args.nextJti,
        refreshRotatedAt: sql`now()`,
        lastUsedAt: new Date(),
      })
      .where(and(
        eq(UserTokensSchema.id, args.sessionId),
        eq(UserTokensSchema.refreshJti, args.presentedJti),
        this.notExpired(),
      ))
      .returning({ id: UserTokensSchema.id })
    if (rotated.length > 0) return { status: 'rotated', refreshJti: args.nextJti }

    const [session] = await this.db.dbDrizzle
      .select({
        refreshJti: UserTokensSchema.refreshJti,
        prevRefreshJti: UserTokensSchema.prevRefreshJti,
        rotatedJustNow: sql<boolean>`coalesce(${UserTokensSchema.refreshRotatedAt} > now() - make_interval(secs => ${REFRESH_REPEAT_GRACE_SECONDS}), false)`,
      })
      .from(UserTokensSchema)
      .where(and(eq(UserTokensSchema.id, args.sessionId), this.notExpired()))
    if (!session) return { status: 'inactive' }

    if (session.refreshJti && session.prevRefreshJti === args.presentedJti && session.rotatedJustNow) {
      return { status: 'repeated', refreshJti: session.refreshJti }
    }
    return { status: 'reused' }
  }

  async isSessionActive(sessionId: number): Promise<boolean> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle.select({ id: UserTokensSchema.id })
        .from(UserTokensSchema)
        .where(and(eq(UserTokensSchema.id, sessionId), this.notExpired()))
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
        .where(and(eq(UserTokensSchema.userId, userId), this.notExpired()))
        .orderBy(UserTokensSchema.lastUsedAt)
    )
    return result ?? []
  }
}
