import type { AppUser } from '../../core/AppUser'
import { SsoRepository } from './SsoRepository'
import type { SsoConfigArgCreate, SsoConfigArgUpdate } from './types'

export class SsoManager {
  public readonly repository: SsoRepository
  private readonly user: AppUser

  constructor(user: AppUser) {
    this.user = user
    this.repository = new SsoRepository()
  }

  async listConfigsForOrg(orgId: number) {
    return await this.repository.listByOrgId(orgId)
  }

  async createConfig(data: SsoConfigArgCreate) {
    return await this.repository.create({
      organizationId: data.organizationId,
      protocol: data.protocol,
      displayName: data.displayName,
      enabled: data.enabled ?? 1,
      samlEntryPoint: data.samlEntryPoint ?? null,
      samlIssuer: data.samlIssuer ?? null,
      samlCert: data.samlCert ?? null,
      samlCallbackUrl: data.samlCallbackUrl ?? null,
      samlSigningKey: data.samlSigningKey ?? null,
      samlSigningCert: data.samlSigningCert ?? null,
      samlLogoutUrl: data.samlLogoutUrl ?? null,
      oidcIssuer: data.oidcIssuer ?? null,
      oidcClientId: data.oidcClientId ?? null,
      oidcClientSecret: data.oidcClientSecret ?? null,
      oidcCallbackUrl: data.oidcCallbackUrl ?? null,
      oidcScope: data.oidcScope ?? null,
      defaultOrgRole: data.defaultOrgRole ?? 'member',
      emailDomainRestriction: data.emailDomainRestriction.toLowerCase(),
    })
  }

  async updateConfig(configId: number, data: SsoConfigArgUpdate) {
    return await this.repository.update(configId, data)
  }

  async deleteConfig(configId: number) {
    return await this.repository.delete(configId)
  }
}
