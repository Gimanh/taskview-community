import type { AppUser } from '../../core/AppUser'
import { UiPreferencesRepository } from './UiPreferencesRepository'
import type { UiPreferences } from './types'

export class UiPreferencesManager {
  private readonly repository: UiPreferencesRepository
  private readonly user: AppUser

  constructor(user: AppUser) {
    this.user = user
    this.repository = new UiPreferencesRepository()
  }

  async get(): Promise<UiPreferences> {
    const userId = this.user.getUserData()?.id
    if (!userId) return {}
    return this.repository.getForUser(userId)
  }

  async update(prefs: UiPreferences): Promise<UiPreferences | null> {
    const userId = this.user.getUserData()?.id
    if (!userId) return null
    return this.repository.upsert({ userId, prefs })
  }
}
