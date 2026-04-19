import type { SsoConfigsSchemaTypeForSelect, OrganizationsSchemaTypeForSelect } from 'taskview-db-schemas'
import AuthModel from '../auth/AuthModel'
import SessionStorage from '../auth/SessionStorage'
import { OrganizationRepository } from '../organizations/OrganizationRepository'
import { SsoRepository } from '../sso/SsoRepository'

export class ScimManager {
  private readonly orgRepo = new OrganizationRepository()
  private readonly ssoRepo = new SsoRepository()
  private readonly authModel = new AuthModel()
  private readonly sessionStorage = new SessionStorage()

  async deactivateUser(
    org: OrganizationsSchemaTypeForSelect,
    config: SsoConfigsSchemaTypeForSelect,
    email: string,
  ) {
    const member = await this.orgRepo.getMemberByEmail(org.id, email)
    if (!member) return false

    const user = await this.authModel.fetchUserByEmail(email)

    await this.orgRepo.removeMember(org.id, email)
    await this.orgRepo.removeUserFromOrgGoals(org.id, email)

    if (user) {
      await this.ssoRepo.deleteIdentityByUser(user.id, config.id)
      await this.sessionStorage.deleteAllSessions(user.id)
    }

    return true
  }

  async reactivateUser(
    org: OrganizationsSchemaTypeForSelect,
    email: string,
    role: string = 'member',
  ) {
    await this.orgRepo.addMember(org.id, email, role)
    return true
  }

  async listUsers(orgId: number) {
    return await this.orgRepo.fetchMembers(orgId)
  }

  async getUserByEmail(orgId: number, email: string) {
    return await this.orgRepo.getMemberByEmail(orgId, email)
  }
}
