import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test'
import { TEST_USER } from './fixtures/auth'
import { startMockOidcIdp, type MockIdpUser, type MockOidcIdp } from './fixtures/mock-oidc-idp'

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:1401'
const IDP_PORT = 14655
const RUN_ID = Date.now()
const EMAIL_DOMAIN = 'sso-e2e.test'
const AUTO_EMAIL_DOMAIN = 'auto.sso-e2e.test'
const TRUSTED_DOMAINS_HINT = 'SSO_TRUSTED_DOMAINS=sso-e2e.test,auto.sso-e2e.test'
const RANDOM_LOGIN_RE = /^[A-Za-z0-9]{7}$/

let api: APIRequestContext
let idp: MockOidcIdp
let adminToken: string
let ssoConfigId: number
let adminOrgId: number
let firstCollisionLogin: string

function getSetCookies(headers: { name: string, value: string }[]): string[] {
  return headers
    .filter((h) => h.name.toLowerCase() === 'set-cookie')
    .map((h) => h.value.split(';')[0])
}

function decodeJwtPayload(token: string): { userData: { id: number, login: string, email: string } } {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
}

/**
 * Walks the full OIDC dance against the running API and the mock IdP:
 * initiate -> IdP authorize -> API callback -> one-time code -> JWT.
 * Returns the login stored for the user, taken from the issued JWT payload.
 */
async function loginViaSso(args: { user: MockIdpUser, configId?: number }): Promise<{ login: string, email: string }> {
  const { user, configId = ssoConfigId } = args
  idp.setUser(user)
  const flow = await pwRequest.newContext()
  try {
    const initiate = await flow.get(`${API_URL}/module/sso/login/${configId}`, { maxRedirects: 0 })
    expect(initiate.status()).toBe(302)
    const cookies = getSetCookies(initiate.headersArray())
    expect(cookies.length).toBeGreaterThanOrEqual(3)
    const authorizeUrl = initiate.headers()['location']

    const authorize = await flow.get(authorizeUrl, { maxRedirects: 0 })
    expect(authorize.status()).toBe(302)
    const callbackUrl = authorize.headers()['location']

    const callback = await flow.get(callbackUrl, {
      maxRedirects: 0,
      headers: { cookie: cookies.join('; ') },
    })
    expect(callback.status()).toBe(302)
    const redirect = new URL(callback.headers()['location'])
    expect(redirect.searchParams.has('sso_error'), `SSO callback failed: ${redirect.href}`).toBe(false)

    const authData = JSON.parse(redirect.searchParams.get('tokens')!)
    const byCode = await flow.post(`${API_URL}/module/auth/login-by-code`, {
      data: { email: authData.email, code: authData.code },
    })
    expect(byCode.ok()).toBe(true)
    const { access } = await byCode.json()
    const { userData } = decodeJwtPayload(access)
    return { login: userData.login, email: userData.email }
  } finally {
    await flow.dispose()
  }
}

test.describe.configure({ mode: 'serial' })

test.describe('SSO OIDC login', () => {
  test.beforeAll(async () => {
    idp = await startMockOidcIdp(IDP_PORT)
    api = await pwRequest.newContext()

    const login = await api.post(`${API_URL}/module/auth/login`, {
      form: { login: TEST_USER.login, password: TEST_USER.password },
    })
    expect(login.ok()).toBe(true)
    adminToken = (await login.json()).access

    const orgs = await api.get(`${API_URL}/module/organizations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const adminOrg = (await orgs.json()).response
      .find((org: { currentUserRole: string }) => ['owner', 'admin'].includes(org.currentUserRole))
    expect(adminOrg).toBeTruthy()
    adminOrgId = adminOrg.id

    const listed = await api.get(`${API_URL}/module/sso/admin/configs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: { organizationId: adminOrg.id },
    })
    expect(listed.ok()).toBe(true)
    for (const config of (await listed.json()).response as { id: number, emailDomainRestriction: string }[]) {
      if ([EMAIL_DOMAIN, AUTO_EMAIL_DOMAIN].includes(config.emailDomainRestriction)) {
        await api.delete(`${API_URL}/module/sso/admin/configs/${config.id}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      }
    }

    const created = await api.post(`${API_URL}/module/sso/admin/configs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        organizationId: adminOrg.id,
        protocol: 'oidc',
        displayName: `E2E OIDC ${RUN_ID}`,
        enabled: 1,
        oidcIssuer: idp.issuer,
        oidcClientId: idp.clientId,
        oidcClientSecret: idp.clientSecret,
        oidcCallbackUrl: `${API_URL}/module/sso/callback/0`,
        oidcScope: 'openid email profile',
        defaultOrgRole: 'member',
        emailDomainRestriction: EMAIL_DOMAIN,
      },
    })
    expect(created.ok()).toBe(true)
    const createdBody = await created.json()
    ssoConfigId = createdBody.response.id
    expect(
      createdBody.response.isDomainTrusted || createdBody.response.isDomainVerified,
      `SSO login e2e needs the API to trust ${EMAIL_DOMAIN}. Set ${TRUSTED_DOMAINS_HINT} on the API.`,
    ).toBe(true)
    expect(createdBody.response.enabled).toBe(1)

    const patched = await api.patch(`${API_URL}/module/sso/admin/configs/${ssoConfigId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { oidcCallbackUrl: `${API_URL}/module/sso/callback/${ssoConfigId}` },
    })
    expect(patched.ok()).toBe(true)
  })

  test.afterAll(async () => {
    if (ssoConfigId) {
      await api.delete(`${API_URL}/module/sso/admin/configs/${ssoConfigId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    }
    await api?.dispose()
    await idp?.close()
  })

  test('unverified domain cannot start SSO login', async () => {
    const created = await api.post(`${API_URL}/module/sso/admin/configs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        organizationId: adminOrgId,
        protocol: 'oidc',
        displayName: `E2E OIDC unverified ${RUN_ID}`,
        enabled: 1,
        oidcIssuer: idp.issuer,
        oidcClientId: idp.clientId,
        oidcClientSecret: idp.clientSecret,
        oidcCallbackUrl: `${API_URL}/module/sso/callback/0`,
        oidcScope: 'openid email profile',
        defaultOrgRole: 'member',
        emailDomainRestriction: `unverified-${RUN_ID}.example`,
      },
    })
    expect(created.ok()).toBe(true)
    const unverified = await created.json()
    expect(unverified.response.isDomainVerified).toBe(false)
    expect(unverified.response.enabled).toBe(0)
    const unverifiedId = unverified.response.id

    try {
      const initiate = await api.get(`${API_URL}/module/sso/login/${unverifiedId}`, { maxRedirects: 0 })
      expect([302, 404]).toContain(initiate.status())
      if (initiate.status() === 302) {
        const location = new URL(initiate.headers()['location'])
        expect(location.searchParams.get('sso_error')).toBe('domain_unverified')
      }
    } finally {
      await api.delete(`${API_URL}/module/sso/admin/configs/${unverifiedId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    }
  })

  test('new SSO user gets preferred_username as login', async () => {
    const preferredUsername = `pu.${RUN_ID}`
    const { login } = await loginViaSso({
      user: {
        sub: `sub-1-${RUN_ID}`,
        email: `first.${RUN_ID}@${EMAIL_DOMAIN}`,
        name: 'First User',
        preferredUsername,
      },
    })
    expect(login).toBe(preferredUsername)
  })

  test('new SSO user without preferred_username gets a random 7-char login', async () => {
    const { login } = await loginViaSso({
      user: {
        sub: `sub-2-${RUN_ID}`,
        email: `second.${RUN_ID}@${EMAIL_DOMAIN}`,
        name: 'Second User',
      },
    })
    expect(login).toMatch(RANDOM_LOGIN_RE)
  })

  test('taken preferred_username gets a random letter suffix', async () => {
    const preferredUsername = `pu.${RUN_ID}`
    const { login } = await loginViaSso({
      user: {
        sub: `sub-3-${RUN_ID}`,
        email: `third.${RUN_ID}@${EMAIL_DOMAIN}`,
        name: 'Third User',
        preferredUsername,
      },
    })
    expect(login).toMatch(new RegExp(`^pu\\.${RUN_ID}\\.[a-z]{3}$`))
    firstCollisionLogin = login
  })

  test('second collision gets a different letter suffix', async () => {
    const preferredUsername = `pu.${RUN_ID}`
    const { login } = await loginViaSso({
      user: {
        sub: `sub-4-${RUN_ID}`,
        email: `fourth.${RUN_ID}@${EMAIL_DOMAIN}`,
        name: 'Fourth User',
        preferredUsername,
      },
    })
    expect(login).toMatch(new RegExp(`^pu\\.${RUN_ID}\\.[a-z]{3}$`))
    expect(login).not.toBe(firstCollisionLogin)
  })

  test('IdP email change keeps the same TaskView user', async () => {
    const preferredUsername = `email.change.${RUN_ID}`
    const sub = `sub-email-${RUN_ID}`
    const first = await loginViaSso({
      user: {
        sub,
        email: `before.${RUN_ID}@${EMAIL_DOMAIN}`,
        name: 'Before Change',
        preferredUsername,
      },
    })
    expect(first.login).toBe(preferredUsername)

    const second = await loginViaSso({
      user: {
        sub,
        email: `after.${RUN_ID}@${EMAIL_DOMAIN}`,
        name: 'After Change',
        preferredUsername: `should.not.apply.${RUN_ID}`,
      },
    })
    expect(second.login).toBe(preferredUsername)
    expect(second.email).toBe(`after.${RUN_ID}@${EMAIL_DOMAIN}`)
  })

  test('IdP email change refuses an address already used by another user', async () => {
    const taken = await loginViaSso({
      user: {
        sub: `sub-taken-${RUN_ID}`,
        email: `taken.${RUN_ID}@${EMAIL_DOMAIN}`,
        name: 'Taken User',
        preferredUsername: `taken.${RUN_ID}`,
      },
    })
    expect(taken.login).toBe(`taken.${RUN_ID}`)

    await loginViaSso({
      user: {
        sub: `sub-changer-${RUN_ID}`,
        email: `changer.${RUN_ID}@${EMAIL_DOMAIN}`,
        name: 'Changer',
        preferredUsername: `changer.${RUN_ID}`,
      },
    })

    const flow = await pwRequest.newContext()
    try {
      idp.setUser({
        sub: `sub-changer-${RUN_ID}`,
        email: `taken.${RUN_ID}@${EMAIL_DOMAIN}`,
        name: 'Changer',
        preferredUsername: `changer.${RUN_ID}`,
      })
      const initiate = await flow.get(`${API_URL}/module/sso/login/${ssoConfigId}`, { maxRedirects: 0 })
      expect(initiate.status()).toBe(302)
      const cookies = getSetCookies(initiate.headersArray())
      const authorize = await flow.get(initiate.headers()['location'], { maxRedirects: 0 })
      expect(authorize.status()).toBe(302)
      const callback = await flow.get(authorize.headers()['location'], {
        maxRedirects: 0,
        headers: { cookie: cookies.join('; ') },
      })
      expect(callback.status()).toBe(302)
      const redirect = new URL(callback.headers()['location'])
      expect(redirect.searchParams.get('sso_error')).toBe('email_in_use')
    } finally {
      await flow.dispose()
    }
  })

  test('second IdP user cannot take an email already linked on this SSO', async () => {
    const linked = await loginViaSso({
      user: {
        sub: `sub-linked-${RUN_ID}`,
        email: `linked.${RUN_ID}@${EMAIL_DOMAIN}`,
        name: 'Linked User',
        preferredUsername: `linked.${RUN_ID}`,
      },
    })
    expect(linked.login).toBe(`linked.${RUN_ID}`)

    const flow = await pwRequest.newContext()
    try {
      idp.setUser({
        sub: `sub-other-${RUN_ID}`,
        email: `linked.${RUN_ID}@${EMAIL_DOMAIN}`,
        name: 'Other User',
        preferredUsername: `other.${RUN_ID}`,
      })
      const initiate = await flow.get(`${API_URL}/module/sso/login/${ssoConfigId}`, { maxRedirects: 0 })
      expect(initiate.status()).toBe(302)
      const cookies = getSetCookies(initiate.headersArray())
      const authorize = await flow.get(initiate.headers()['location'], { maxRedirects: 0 })
      expect(authorize.status()).toBe(302)
      const callback = await flow.get(authorize.headers()['location'], {
        maxRedirects: 0,
        headers: { cookie: cookies.join('; ') },
      })
      expect(callback.status()).toBe(302)
      const redirect = new URL(callback.headers()['location'])
      expect(redirect.searchParams.get('sso_error')).toBe('email_in_use')
    } finally {
      await flow.dispose()
    }
  })

  test('flow works without configured callback URL (auto-derived from request)', async () => {
    const created = await api.post(`${API_URL}/module/sso/admin/configs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        organizationId: adminOrgId,
        protocol: 'oidc',
        displayName: `E2E OIDC auto ${RUN_ID}`,
        enabled: 1,
        oidcIssuer: idp.issuer,
        oidcClientId: idp.clientId,
        oidcClientSecret: idp.clientSecret,
        oidcCallbackUrl: '',
        oidcScope: 'openid email profile',
        defaultOrgRole: 'member',
        emailDomainRestriction: AUTO_EMAIL_DOMAIN,
      },
    })
    expect(created.ok()).toBe(true)
    const autoBody = await created.json()
    expect(
      autoBody.response.isDomainTrusted || autoBody.response.isDomainVerified,
      `SSO login e2e needs the API to trust ${AUTO_EMAIL_DOMAIN}. Set ${TRUSTED_DOMAINS_HINT} on the API.`,
    ).toBe(true)
    const autoConfigId = autoBody.response.id

    try {
      const preferredUsername = `auto.pu.${RUN_ID}`
      const { login } = await loginViaSso({
        user: {
          sub: `sub-5-${RUN_ID}`,
          email: `fifth.${RUN_ID}@${AUTO_EMAIL_DOMAIN}`,
          name: 'Fifth User',
          preferredUsername,
        },
        configId: autoConfigId,
      })
      expect(login).toBe(preferredUsername)
    } finally {
      await api.delete(`${API_URL}/module/sso/admin/configs/${autoConfigId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    }
  })
})
