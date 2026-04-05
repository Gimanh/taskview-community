import type { AppUser } from '../../core/AppUser'
import { isNotNullable } from '../../utils/helpers'
import { OrganizationRepository } from './OrganizationRepository'
import type { OrganizationArgCreate, OrganizationArgUpdate } from './types'

export class OrganizationManager {
  public readonly repository: OrganizationRepository
  private readonly user: AppUser

  constructor(user: AppUser) {
    this.user = user
    this.repository = new OrganizationRepository()
  }

  private getUserId(): number | null {
    const id = this.user.getUserData()?.id
    return isNotNullable(id) ? id : null
  }

  private getUserEmail(): string | null {
    return this.user.getUserData()?.email ?? null
  }

  async create(data: OrganizationArgCreate) {
    const userId = this.getUserId()
    const email = this.getUserEmail()
    if (!userId || !email) return false

    const slug = data.slug ?? this.generateSlug()

    const existing = await this.repository.findBySlug(slug)
    if (existing) return false

    const org = await this.repository.create({ ...data, slug }, userId)
    if (!org) return false

    await this.repository.addMember(org.id, email, 'owner')
    return org
  }

  async update(data: OrganizationArgUpdate) {
    if (data.slug) {
      const existing = await this.repository.findBySlug(data.slug)
      if (existing && existing.id !== data.organizationId) return false
    }

    return await this.repository.update(data)
  }

  async delete(orgId: number) {
    const org = await this.repository.findById(orgId)
    if (!org) return false
    if (org.isPersonal) return false

    const userId = this.getUserId()
    if (org.ownerId !== userId) return false

    return await this.repository.delete(orgId)
  }

  async fetchForCurrentUser() {
    const email = this.getUserEmail()
    if (!email) return []

    return await this.repository.fetchForUserByEmail(email)
  }

  async getById(orgId: number) {
    return await this.repository.findById(orgId)
  }

  async getPersonalOrgId(): Promise<number | false> {
    const userId = this.getUserId()
    if (!userId) return false

    const org = await this.repository.findPersonalForUser(userId)
    if (!org) return false

    return org.id
  }

  async addMember(orgId: number, email: string, role: string = 'member') {
    const userId = this.getUserId()
    if (!userId) return false
    if (role === 'owner') return false

    return await this.repository.addMember(orgId, email, role, userId)
  }

  async updateMemberRole(orgId: number, email: string, role: string) {
    const targetMember = await this.repository.getMemberByEmail(orgId, email)
    if (!targetMember || targetMember.role === 'owner') return false

    return await this.repository.updateMemberRole(orgId, email, role)
  }

  async removeMember(orgId: number, email: string) {
    const org = await this.repository.findById(orgId)
    if (!org) return false

    const targetMember = await this.repository.getMemberByEmail(orgId, email)
    if (!targetMember || targetMember.role === 'owner') return false

    const removed = await this.repository.removeMember(orgId, email)
    if (removed) {
      await this.repository.removeUserFromOrgGoals(orgId, email)
    }
    return removed
  }

  async fetchMembers(orgId: number) {
    return await this.repository.fetchMembers(orgId)
  }

  async getCurrentUserMember(orgId: number) {
    const email = this.getUserEmail()
    if (!email) return false
    return await this.repository.getMemberByEmail(orgId, email)
  }

  private generateSlug(): string {
    return `org-${crypto.randomUUID().slice(0, 8)}`
  }
}
