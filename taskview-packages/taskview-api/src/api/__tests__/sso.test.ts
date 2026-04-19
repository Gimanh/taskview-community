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

  it('should create SSO config with SAML protocol', async () => {
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

  it('should check domain and find provider', async () => {
    const provider = await user1Api.sso.checkDomain('sso-test.example')

    expect(provider).toBeTruthy()
    expect(provider!.id).toBe(configId)
    expect(provider!.protocol).toBe('saml')
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
