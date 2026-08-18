import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { TvApi } from '@/tv'
import { initApi } from './init-api'

let user1Api: TvApi
let user2Api: TvApi
let deleteAllGoals: () => Promise<void>

let testOrgId: number

beforeAll(async () => {
  const init = await initApi()
  user1Api = init.$tvApi
  user2Api = init.$tvApiForSecondUser
  deleteAllGoals = init.deleteAllGoals

  const org = await user1Api.organizations.create({ name: 'SSO Test Org' })
  testOrgId = org.id
})

afterAll(async () => {
  await user1Api.organizations.delete(testOrgId).catch(() => {})
  await deleteAllGoals()
})

describe('SSO: config management', () => {
  let configId: number

  it('should create an unverified SSO config', async () => {
    const config = await user1Api.sso.createConfig({
      organizationId: testOrgId,
      protocol: 'saml',
      displayName: 'Test SAML',
      emailDomainRestriction: 'sso-test.example',
      samlEntryPoint: 'https://idp.example.com/saml/sso',
      samlIssuer: 'taskview-test',
      samlCert: 'MIICmzCCAYMCBgF...',
      samlCallbackUrl: 'http://localhost:11401/module/sso/callback/0',
    })

    expect(config).toBeTruthy()
    expect(config.id).toBeGreaterThan(0)
    expect(config.protocol).toBe('saml')
    expect(config.displayName).toBe('Test SAML')
    expect(config.emailDomainRestriction).toBe('sso-test.example')
    expect(config.enabled).toBe(0)
    expect(config.isDomainVerified).toBe(false)
    expect(config.domainVerifyToken).toBeTruthy()
    configId = config.id
  })

  it('should list configs for organization', async () => {
    const configs = await user1Api.sso.listConfigs(testOrgId)

    expect(configs.length).toBeGreaterThan(0)
    const found = configs.find(c => c.id === configId)
    expect(found).toBeTruthy()
    expect(found!.displayName).toBe('Test SAML')
  })

  it('should reject duplicate domain', async () => {
    try {
      await user1Api.sso.createConfig({
        organizationId: testOrgId,
        protocol: 'oidc',
        displayName: 'Duplicate Domain',
        emailDomainRestriction: 'sso-test.example',
        oidcIssuer: 'https://accounts.google.com',
        oidcClientId: 'test',
        oidcClientSecret: 'test',
        oidcCallbackUrl: 'http://localhost:11401/module/sso/callback/0',
      })
      expect.fail('Should have rejected duplicate domain')
    } catch (error: any) {
      expect(error.response?.status).toBe(409)
    }
  })

  it('should update config', async () => {
    const updated = await user1Api.sso.updateConfig(configId, {
      displayName: 'Updated SAML',
    })

    expect(updated).toBeTruthy()
    expect(updated.displayName).toBe('Updated SAML')
  })

  it('should not list an unverified domain as a public provider', async () => {
    const provider = await user1Api.sso.checkDomain('sso-test.example')
    expect(provider).toBeNull()
  })

  it('should return DNS and HTTP proof instructions', async () => {
    const started = await user1Api.sso.startDomainVerification(configId)

    expect(started.token).toBeTruthy()
    expect(started.dnsRecord).toBe(`taskview-sso-verify=${started.token}`)
    expect(started.httpUrl).toContain('/.well-known/taskview-sso-verify.txt')
    expect(started.isDomainVerified).toBe(false)
  })

  it('should not mark a domain verified when DNS and HTTP proofs are missing', async () => {
    const result = await user1Api.sso.checkDomainVerification(configId)
    expect(result.verified).toBe(false)
    expect(result.method).toBeNull()
  })

  it('should return null for unknown domain', async () => {
    const provider = await user1Api.sso.checkDomain('nonexistent.example')

    expect(provider).toBeNull()
  })

  // TODO: re-enable after rebuilding Docker test image with IsOrgAdmin fix on GET /admin/configs
  it.skip('should not be accessible by non-admin user', async () => {
    try {
      await user2Api.sso.listConfigs(testOrgId)
      expect.fail('Should have rejected non-admin user')
    } catch (error: any) {
      expect([400, 403]).toContain(error.response?.status)
    }
  })

  it('should not allow non-admin to delete config', async () => {
    const config = await user1Api.sso.createConfig({
      organizationId: testOrgId,
      protocol: 'saml',
      displayName: 'Auth Test SAML',
      emailDomainRestriction: 'auth-test.example',
      samlEntryPoint: 'https://idp.example.com/saml/sso',
      samlIssuer: 'taskview-auth-test',
      samlCert: 'MIICmzCCAYMCBgF...',
      samlCallbackUrl: 'http://localhost:11401/module/sso/callback/0',
    })

    try {
      await user2Api.sso.deleteConfig(config.id)
      expect.fail('Should have rejected non-admin user')
    } catch (error: any) {
      expect([400, 403]).toContain(error.response?.status)
    }

    await user1Api.sso.deleteConfig(config.id)
  })

  it('should return null for checkDomain when config is disabled', async () => {
    const config = await user1Api.sso.createConfig({
      organizationId: testOrgId,
      protocol: 'saml',
      displayName: 'Disabled SAML',
      emailDomainRestriction: 'disabled-test.example',
      samlEntryPoint: 'https://idp.example.com/saml/sso',
      samlIssuer: 'taskview-disabled-test',
      samlCert: 'MIICmzCCAYMCBgF...',
      samlCallbackUrl: 'http://localhost:11401/module/sso/callback/0',
    })

    await user1Api.sso.updateConfig(config.id, { enabled: 0 })

    const provider = await user1Api.sso.checkDomain('disabled-test.example')
    expect(provider).toBeNull()

    await user1Api.sso.deleteConfig(config.id)
  })

  it('should reject update to duplicate domain', async () => {
    const config2 = await user1Api.sso.createConfig({
      organizationId: testOrgId,
      protocol: 'saml',
      displayName: 'Domain Clash SAML',
      emailDomainRestriction: 'clash-test.example',
      samlEntryPoint: 'https://idp.example.com/saml/sso',
      samlIssuer: 'taskview-clash-test',
      samlCert: 'MIICmzCCAYMCBgF...',
      samlCallbackUrl: 'http://localhost:11401/module/sso/callback/0',
    })

    try {
      await user1Api.sso.createConfig({
        organizationId: testOrgId,
        protocol: 'saml',
        displayName: 'Clash Attempt',
        emailDomainRestriction: 'clash-test.example',
        samlEntryPoint: 'https://idp.example.com/saml/sso',
        samlIssuer: 'taskview-clash2',
        samlCert: 'MIICmzCCAYMCBgF...',
        samlCallbackUrl: 'http://localhost:11401/module/sso/callback/0',
      })
      expect.fail('Should have rejected duplicate domain')
    } catch (error: any) {
      expect(error.response?.status).toBe(409)
    }

    await user1Api.sso.deleteConfig(config2.id)
  })

  it('should delete config', async () => {
    const result = await user1Api.sso.deleteConfig(configId)
    expect(result).toBe(true)

    const configs = await user1Api.sso.listConfigs(testOrgId)
    const found = configs.find(c => c.id === configId)
    expect(found).toBeUndefined()
  })
})

describe('SSO: cross-org domain squatting', () => {
  const squatDomain = 'squat-test.example'
  let secondOrgId: number
  let firstConfigId: number
  let secondConfigId: number

  beforeAll(async () => {
    const org = await user2Api.organizations.create({ name: 'SSO Squat Org' })
    secondOrgId = org.id
  })

  afterAll(async () => {
    await user1Api.sso.deleteConfig(firstConfigId).catch(() => {})
    await user2Api.sso.deleteConfig(secondConfigId).catch(() => {})
    await user2Api.organizations.delete(secondOrgId).catch(() => {})
  })

  it('lets a different org create an unverified config for the same domain (no squatting)', async () => {
    const first = await user1Api.sso.createConfig({
      organizationId: testOrgId,
      protocol: 'saml',
      displayName: 'Squat First',
      emailDomainRestriction: squatDomain,
      samlEntryPoint: 'https://idp.example.com/saml/sso',
      samlIssuer: 'taskview-squat-1',
      samlCert: 'MIICmzCCAYMCBgF...',
      samlCallbackUrl: 'http://localhost:11401/module/sso/callback/0',
    })
    firstConfigId = first.id
    expect(first.isDomainVerified).toBe(false)

    const second = await user2Api.sso.createConfig({
      organizationId: secondOrgId,
      protocol: 'saml',
      displayName: 'Squat Second',
      emailDomainRestriction: squatDomain,
      samlEntryPoint: 'https://idp.example.com/saml/sso',
      samlIssuer: 'taskview-squat-2',
      samlCert: 'MIICmzCCAYMCBgF...',
      samlCallbackUrl: 'http://localhost:11401/module/sso/callback/0',
    })
    secondConfigId = second.id
    expect(second.isDomainVerified).toBe(false)
    expect(second.id).not.toBe(first.id)
  })

  it('still rejects a duplicate config for the same domain within one org', async () => {
    try {
      await user1Api.sso.createConfig({
        organizationId: testOrgId,
        protocol: 'oidc',
        displayName: 'Squat Same Org',
        emailDomainRestriction: squatDomain,
        oidcIssuer: 'https://accounts.google.com',
        oidcClientId: 'test',
        oidcClientSecret: 'test',
        oidcCallbackUrl: 'http://localhost:11401/module/sso/callback/0',
      })
      expect.fail('Should have rejected duplicate domain within the same org')
    } catch (error: any) {
      expect(error.response?.status).toBe(409)
    }
  })

  it('rejects a second org creating a config for a domain another org already verified', async () => {
    const ownedDomain = 'owned-sso.example' // in SSO_TRUSTED_DOMAINS → verified on creation

    const owner = await user1Api.sso.createConfig({
      organizationId: testOrgId,
      protocol: 'saml',
      displayName: 'Owned First',
      emailDomainRestriction: ownedDomain,
      samlEntryPoint: 'https://idp.example.com/saml/sso',
      samlIssuer: 'taskview-owned-1',
      samlCert: 'MIICmzCCAYMCBgF...',
      samlCallbackUrl: 'http://localhost:11401/module/sso/callback/0',
    })
    expect(owner.isDomainVerified).toBe(true)

    try {
      await user2Api.sso.createConfig({
        organizationId: secondOrgId,
        protocol: 'saml',
        displayName: 'Owned Second',
        emailDomainRestriction: ownedDomain,
        samlEntryPoint: 'https://idp.example.com/saml/sso',
        samlIssuer: 'taskview-owned-2',
        samlCert: 'MIICmzCCAYMCBgF...',
        samlCallbackUrl: 'http://localhost:11401/module/sso/callback/0',
      })
      expect.fail('Should have rejected a domain already verified by another org')
    } catch (error: any) {
      expect(error.response?.status).toBe(409)
    } finally {
      await user1Api.sso.deleteConfig(owner.id).catch(() => {})
    }
  })

  it('rejects switching a pending config onto a domain another org already verified', async () => {
    const ownedDomain = 'owned-sso.example'

    const owner = await user1Api.sso.createConfig({
      organizationId: testOrgId,
      protocol: 'saml',
      displayName: 'Owned For Update',
      emailDomainRestriction: ownedDomain,
      samlEntryPoint: 'https://idp.example.com/saml/sso',
      samlIssuer: 'taskview-owned-3',
      samlCert: 'MIICmzCCAYMCBgF...',
      samlCallbackUrl: 'http://localhost:11401/module/sso/callback/0',
    })
    expect(owner.isDomainVerified).toBe(true)

    try {
      // user2's still-pending squat config tries to grab the owned domain
      await user2Api.sso.updateConfig(secondConfigId, { emailDomainRestriction: ownedDomain })
      expect.fail('Should have rejected switching onto a domain owned by another org')
    } catch (error: any) {
      expect(error.response?.status).toBe(409)
    } finally {
      await user1Api.sso.deleteConfig(owner.id).catch(() => {})
    }
  })
})

describe('SSO: SCIM token management', () => {
  let configId: number

  beforeAll(async () => {
    const config = await user1Api.sso.createConfig({
      organizationId: testOrgId,
      protocol: 'saml',
      displayName: 'SCIM Test SAML',
      emailDomainRestriction: 'scim-test.example',
      samlEntryPoint: 'https://idp.example.com/saml/sso',
      samlIssuer: 'taskview-scim-test',
      samlCert: 'MIICmzCCAYMCBgF...',
      samlCallbackUrl: 'http://localhost:11401/module/sso/callback/0',
    })
    configId = config.id
  })

  afterAll(async () => {
    await user1Api.sso.deleteConfig(configId).catch(() => {})
  })

  it('should generate SCIM token', async () => {
    const result = await user1Api.sso.generateScimToken(configId)

    expect(result).toBeTruthy()
    expect(result.token).toBeTruthy()
    expect(result.token.startsWith('tvscim_')).toBe(true)
  })

  it('should have scimEnabled after token generation', async () => {
    const configs = await user1Api.sso.listConfigs(testOrgId)
    const config = configs.find(c => c.id === configId)

    expect(config).toBeTruthy()
    expect(config!.scimEnabled).toBe(1)
  })

  it('should disable SCIM', async () => {
    const result = await user1Api.sso.toggleScim(configId, false)
    expect(result.scimEnabled).toBe(0)
  })

  it('should re-enable SCIM', async () => {
    const result = await user1Api.sso.toggleScim(configId, true)
    expect(result.scimEnabled).toBe(1)
  })

  it('should rotate SCIM token on second generation', async () => {
    const first = await user1Api.sso.generateScimToken(configId)
    const second = await user1Api.sso.generateScimToken(configId)

    expect(second.token).toBeTruthy()
    expect(second.token.startsWith('tvscim_')).toBe(true)
    expect(second.token).not.toBe(first.token)
  })
})
