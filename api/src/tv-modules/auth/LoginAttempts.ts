import { createHash } from 'crypto'
import { and, eq, gt, inArray, lte, sql } from 'drizzle-orm'
import { LoginAttemptsSchema } from 'taskview-db-schemas'
import { Database } from '../../modules/db'
import type { LoginAttemptArgs, LoginAttemptSubject } from '../../types/auth.types'
import { callWithCatch } from '../../utils/helpers'

const DEFAULT_LIMIT = 10
const WINDOW_MINUTES = 15

const ACCOUNT_LIMIT_FACTOR = 5
const ADDRESS_LIMIT_FACTOR = 10


export class LoginAttempts {
  private readonly db: Database

  constructor() {
    this.db = Database.getInstance()
  }

  static limit(): number {
    const raw = process.env.LOGIN_ATTEMPT_LIMIT?.trim()
    if (!raw) return DEFAULT_LIMIT
    const parsed = Number(raw)
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : DEFAULT_LIMIT
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex')
  }

  private subjects(args: LoginAttemptArgs): LoginAttemptSubject[] {
    const limit = LoginAttempts.limit()
    const ip = args.ip || 'unknown'
    return [
      { key: `pair:${this.hash(`${args.login}|${ip}`)}`, limit },
      { key: `login:${this.hash(args.login)}`, limit: limit * ACCOUNT_LIMIT_FACTOR },
      { key: `ip:${ip}`.slice(0, 80), limit: limit * ADDRESS_LIMIT_FACTOR },
    ]
  }

  private windowOpen() {
    return gt(LoginAttemptsSchema.windowStartedAt, sql`now() - make_interval(mins => ${WINDOW_MINUTES})`)
  }

  async secondsUntilAllowed(args: LoginAttemptArgs): Promise<number> {
    if (LoginAttempts.limit() === 0) return 0
    const subjects = this.subjects(args)
    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .select({
          key: LoginAttemptsSchema.key,
          failures: LoginAttemptsSchema.failures,
          secondsLeft: sql<number>`ceil(extract(epoch from (${LoginAttemptsSchema.windowStartedAt} + make_interval(mins => ${WINDOW_MINUTES}) - now())))::int`,
        })
        .from(LoginAttemptsSchema)
        .where(and(inArray(LoginAttemptsSchema.key, subjects.map((s) => s.key)), this.windowOpen()))
    )
    if (!rows) return 0

    const limits = new Map(subjects.map((s) => [s.key, s.limit]))
    const waits = rows
      .filter((row) => row.failures >= (limits.get(row.key) ?? Infinity))
      .map((row) => Math.max(row.secondsLeft, 1))
    return waits.length > 0 ? Math.max(...waits) : 0
  }

  async registerFailure(args: LoginAttemptArgs): Promise<void> {
    if (LoginAttempts.limit() === 0) return
    const windowExpired = sql`${LoginAttemptsSchema.windowStartedAt} <= now() - make_interval(mins => ${WINDOW_MINUTES})`
    await callWithCatch(async () => {
      await this.db.dbDrizzle
        .delete(LoginAttemptsSchema)
        .where(lte(LoginAttemptsSchema.windowStartedAt, sql`now() - make_interval(mins => ${WINDOW_MINUTES * 4})`))
      await this.db.dbDrizzle
        .insert(LoginAttemptsSchema)
        .values(this.subjects(args).map((subject) => ({ key: subject.key, failures: 1 })))
        .onConflictDoUpdate({
          target: LoginAttemptsSchema.key,
          set: {
            failures: sql`case when ${windowExpired} then 1 else ${LoginAttemptsSchema.failures} + 1 end`,
            windowStartedAt: sql`case when ${windowExpired} then now() else ${LoginAttemptsSchema.windowStartedAt} end`,
          },
        })
    })
  }

  async clearAfterSuccess(args: LoginAttemptArgs): Promise<void> {
    if (LoginAttempts.limit() === 0) return
    const [pair] = this.subjects(args)
    await callWithCatch(() =>
      this.db.dbDrizzle.delete(LoginAttemptsSchema).where(eq(LoginAttemptsSchema.key, pair.key))
    )
  }
}
