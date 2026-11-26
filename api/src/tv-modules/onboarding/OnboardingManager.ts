import type { OnboardingFinishStatus, OnboardingState } from 'taskview-api'
import type { AppUser } from '../../core/AppUser'
import { OnboardingRepository } from './OnboardingRepository'

export class OnboardingManager {
  private readonly repository: OnboardingRepository
  private readonly user: AppUser

  constructor(user: AppUser) {
    this.user = user
    this.repository = new OnboardingRepository()
  }

  async get(): Promise<OnboardingState | null> {
    const userId = this.user.getUserData()?.id
    if (!userId) return null
    const status = await this.repository.getStatus(userId)
    return { status: status ?? 'pending' }
  }

  async finish(status: OnboardingFinishStatus): Promise<OnboardingState | null> {
    const userId = this.user.getUserData()?.id
    if (!userId) return null
    await this.repository.finish({ userId, status })
    return { status }
  }
}
