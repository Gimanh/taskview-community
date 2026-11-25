import { eq, sql } from 'drizzle-orm'
import { UserOnboardingSchema } from 'taskview-db-schemas'
import type { OnboardingFinishStatus } from 'taskview-api'
import { Database } from '../../modules/db'
import type { FinishOnboardingArgs } from './types'

export class OnboardingRepository {
  private readonly db: Database

  constructor() {
    this.db = Database.getInstance()
  }

  async getStatus(userId: number): Promise<OnboardingFinishStatus | null> {
    const [row] = await this.db.dbDrizzle
      .select({ status: UserOnboardingSchema.status })
      .from(UserOnboardingSchema)
      .where(eq(UserOnboardingSchema.userId, userId))
    return (row?.status as OnboardingFinishStatus | undefined) ?? null
  }

  async finish(args: FinishOnboardingArgs): Promise<void> {
    const { userId, status } = args
    await this.db.dbDrizzle
      .insert(UserOnboardingSchema)
      .values({ userId, status, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: UserOnboardingSchema.userId,
        set: { status, updatedAt: sql`now()` },
      })
  }
}
