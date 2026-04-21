import type { AppUser } from '../../core/AppUser'
import { encrypt, encryptField } from '../../utils/crypto'
import { SsoRepository } from './SsoRepository'
import { SSO_SECRET_FIELDS } from './sso.utils'
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
      samlCert: encryptField(data.samlCert),
      samlCallbackUrl: data.samlCallbackUrl ?? null,
      samlSigningKey: encryptField(data.samlSigningKey),
      samlSigningCert: encryptField(data.samlSigningCert),
      samlLogoutUrl: data.samlLogoutUrl ?? null,
      oidcIssuer: data.oidcIssuer ?? null,
      oidcClientId: data.oidcClientId ?? null,
      oidcClientSecret: encryptField(data.oidcClientSecret),
      oidcCallbackUrl: data.oidcCallbackUrl ?? null,
      oidcScope: data.oidcScope ?? null,
      defaultOrgRole: data.defaultOrgRole ?? 'member',
      emailDomainRestriction: data.emailDomainRestriction.toLowerCase(),
    })
  }

  async updateConfig(configId: number, data: SsoConfigArgUpdate) {
    const encrypted: Partial<SsoConfigArgUpdate> = { ...data }
    for (const field of SSO_SECRET_FIELDS) {
      if (field in encrypted) {
        if (encrypted[field]) {
          encrypted[field] = encrypt(encrypted[field]!)
        } else {
          delete encrypted[field]
        }
      }
    }
    return await this.repository.update(configId, encrypted)
  }

  async deleteConfig(configId: number) {
    return await this.repository.delete(configId)
  }
}
