import type { AppUser } from '../../core/AppUser'
import { encrypt, encryptField } from '../../utils/crypto'
import { SsoRepository } from './SsoRepository'
import {
  SSO_SECRET_FIELDS,
  generateDomainVerifyToken,
  isSsoDomainVerified,
  isTrustedSsoDomain,
  proveSsoDomainOwnership,
  ssoDomainVerifyDnsRecord,
  ssoDomainVerifyHttpUrl,
} from './sso.utils'
import {
  SsoDomainNotVerifiedError,
  type CheckDomainVerificationResult,
  type SsoConfigArgCreate,
  type SsoConfigArgUpdate,
  type StartDomainVerificationResult,
} from './types'

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
    const domain = data.emailDomainRestriction.toLowerCase()
    const trusted = isTrustedSsoDomain(domain)

    return await this.repository.create({
      organizationId: data.organizationId,
      protocol: data.protocol,
      displayName: data.displayName,
      enabled: trusted ? (data.enabled ?? 1) : 0,
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
      emailDomainRestriction: domain,
      domainVerifyToken: generateDomainVerifyToken(),
      domainVerifiedAt: trusted ? new Date() : null,
    })
  }

  async updateConfig(configId: number, data: SsoConfigArgUpdate) {
    const current = await this.repository.findById(configId)
    if (!current) return null

    const encrypted: Partial<SsoConfigArgUpdate> & {
      domainVerifyToken?: string
      domainVerifiedAt?: Date | null
      enabled?: number
    } = { ...data }

    for (const field of SSO_SECRET_FIELDS) {
      if (field in encrypted) {
        if (encrypted[field]) {
          encrypted[field] = encrypt(encrypted[field]!)
        } else {
          delete encrypted[field]
        }
      }
    }

    if (data.emailDomainRestriction) {
      const domain = data.emailDomainRestriction.toLowerCase()
      encrypted.emailDomainRestriction = domain
      if (domain !== current.emailDomainRestriction) {
        const trusted = isTrustedSsoDomain(domain)
        encrypted.domainVerifyToken = generateDomainVerifyToken()
        encrypted.domainVerifiedAt = trusted ? new Date() : null
        if (!trusted) encrypted.enabled = 0
        await this.repository.deleteIdentitiesByConfig(configId)
      }
    }

    const nextDomain = encrypted.emailDomainRestriction ?? current.emailDomainRestriction
    const nextVerifiedAt = 'domainVerifiedAt' in encrypted
      ? encrypted.domainVerifiedAt
      : current.domainVerifiedAt
    const wouldBeVerified = isTrustedSsoDomain(nextDomain) || !!nextVerifiedAt

    if (data.enabled === 1 && !wouldBeVerified) {
      throw new SsoDomainNotVerifiedError()
    }

    return await this.repository.update(configId, encrypted)
  }

  async startDomainVerification(configId: number): Promise<StartDomainVerificationResult | null> {
    const config = await this.repository.findById(configId)
    if (!config) return null

    let token = config.domainVerifyToken
    if (!token) {
      token = generateDomainVerifyToken()
      const updated = await this.repository.update(configId, { domainVerifyToken: token })
      if (!updated) return null
    }

    return {
      token,
      dnsRecord: ssoDomainVerifyDnsRecord(token),
      httpUrl: ssoDomainVerifyHttpUrl(config.emailDomainRestriction),
      isDomainVerified: isSsoDomainVerified({ ...config, domainVerifyToken: token }),
      isDomainTrusted: isTrustedSsoDomain(config.emailDomainRestriction),
    }
  }

  async checkDomainVerification(configId: number): Promise<CheckDomainVerificationResult | null> {
    const config = await this.repository.findById(configId)
    if (!config) return null

    if (!config.domainVerifyToken) {
      return {
        verified: isSsoDomainVerified(config),
        method: isTrustedSsoDomain(config.emailDomainRestriction) ? 'trusted' : null
      }
    }

    const method = await proveSsoDomainOwnership({
      domain: config.emailDomainRestriction,
      token: config.domainVerifyToken,
    })

    if (!method) {
      return { verified: isSsoDomainVerified(config), method: null }
    }

    if (!config.domainVerifiedAt || method === 'trusted') {
      const updated = await this.repository.update(configId, {
        domainVerifiedAt: new Date(),
        enabled: 1,
      })
      // The partial unique index rejects a second verified config for the same
      // domain another organization proved ownership first.
      if (!updated) {
        return { verified: false, method: null }
      }
    }

    return { verified: true, method }
  }

  async deleteConfig(configId: number) {
    return await this.repository.delete(configId)
  }
}
