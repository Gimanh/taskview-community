import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import axios from 'axios'
import { TvApi } from '@/tv'
import { initApi, API_URL } from './init-api'

let user1Api: TvApi
let user1Email: string
let user2Email: string
let deleteAllGoals: () => Promise<void>

let testOrgId: number
let scimToken: string
let configId: number

const scimUrl = `${API_URL}/scim/v2`

function scimHeaders() {
  return {
    Authorization: `Bearer ${scimToken}`,
    'Content-Type': 'application/json',
  }
}

beforeAll(async () => {
  const init = await initApi()
  user1Api = init.$tvApi
  user1Email = init.user1Email
  user2Email = init.user2Email
  deleteAllGoals = init.deleteAllGoals

  const org = await user1Api.organizations.create({ name: 'SCIM Test Org' })
  testOrgId = org.id

  const config = await user1Api.sso.createConfig({
    organizationId: testOrgId,
    protocol: 'saml',
    displayName: 'SCIM SAML',
    emailDomainRestriction: 'scim-e2e.example',
    samlEntryPoint: 'https://idp.example.com/saml/sso',
    samlIssuer: 'taskview-scim-e2e',
    samlCert: 'MIICmzCCAYMCBgF...',
    samlCallbackUrl: `${API_URL}/module/sso/callback/0`,
  })
  configId = config.id

  const tokenResult = await user1Api.sso.generateScimToken(configId)
  scimToken = tokenResult.token

  await user1Api.organizations.addMember({
    organizationId: testOrgId,
    email: user2Email,
    role: 'member',
  })
})

afterAll(async () => {
  await user1Api.sso.deleteConfig(configId).catch(() => {})
  await user1Api.organizations.delete(testOrgId).catch(() => {})
  await deleteAllGoals()
})

describe('SCIM: authentication', () => {
  it('should reject request without token', async () => {
    const res = await axios.get(`${scimUrl}/Users`, { validateStatus: () => true })
    expect(res.status).toBe(401)
  })

  it('should reject request with invalid token', async () => {
    const res = await axios.get(`${scimUrl}/Users`, {
      headers: { Authorization: 'Bearer invalid_token' },
      validateStatus: () => true,
    })
    expect(res.status).toBe(401)
  })

  it('should accept request with valid token', async () => {
    const res = await axios.get(`${scimUrl}/Users`, { headers: scimHeaders() })
    expect(res.status).toBe(200)
    expect(res.data.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:ListResponse')
  })
})

describe('SCIM: list users', () => {
  it('should return organization members', async () => {
    const res = await axios.get(`${scimUrl}/Users`, { headers: scimHeaders() })

    expect(res.data.totalResults).toBeGreaterThan(0)
    expect(res.data.Resources).toBeTruthy()

    const emails = res.data.Resources.map((r: any) => r.userName)
    expect(emails).toContain(user1Email)
    expect(emails).toContain(user2Email)
  })

  it('should return SCIM formatted users', async () => {
    const res = await axios.get(`${scimUrl}/Users`, { headers: scimHeaders() })
    const user = res.data.Resources[0]

    expect(user.schemas).toContain('urn:ietf:params:scim:schemas:core:2.0:User')
    expect(user.id).toBeTruthy()
    expect(user.userName).toBeTruthy()
    expect(user.emails).toBeTruthy()
    expect(user.active).toBe(true)
  })
})

describe('SCIM: get user', () => {
  it('should return user by email', async () => {
    const res = await axios.get(`${scimUrl}/Users/${encodeURIComponent(user2Email)}`, {
      headers: scimHeaders(),
    })

    expect(res.status).toBe(200)
    expect(res.data.userName).toBe(user2Email)
    expect(res.data.active).toBe(true)
  })

  it('should return 404 for unknown user', async () => {
    const res = await axios.get(`${scimUrl}/Users/${encodeURIComponent('nobody@example.com')}`, {
      headers: scimHeaders(),
      validateStatus: () => true,
    })
    expect(res.status).toBe(404)
  })
})

describe('SCIM: deactivate user', () => {
  it('should deactivate user (remove from org)', async () => {
    const res = await axios.patch(
      `${scimUrl}/Users/${encodeURIComponent(user2Email)}`,
      {
        Operations: [{ op: 'replace', path: 'active', value: false }],
      },
      { headers: scimHeaders() },
    )

    expect(res.status).toBe(200)
    expect(res.data.active).toBe(false)
  })

  it('should not appear in user list after deactivation', async () => {
    const res = await axios.get(`${scimUrl}/Users`, { headers: scimHeaders() })
    const emails = res.data.Resources.map((r: any) => r.userName)

    expect(emails).not.toContain(user2Email)
  })

  it('should return 404 when getting deactivated user', async () => {
    const res = await axios.get(`${scimUrl}/Users/${encodeURIComponent(user2Email)}`, {
      headers: scimHeaders(),
      validateStatus: () => true,
    })
    expect(res.status).toBe(404)
  })
})

describe('SCIM: reactivate user', () => {
  it('should reactivate user (add back to org)', async () => {
    const res = await axios.patch(
      `${scimUrl}/Users/${encodeURIComponent(user2Email)}`,
      {
        Operations: [{ op: 'replace', path: 'active', value: true }],
      },
      { headers: scimHeaders() },
    )

    expect(res.status).toBe(200)
    expect(res.data.active).toBe(true)
  })

  it('should appear in user list after reactivation', async () => {
    const res = await axios.get(`${scimUrl}/Users`, { headers: scimHeaders() })
    const emails = res.data.Resources.map((r: any) => r.userName)

    expect(emails).toContain(user2Email)
  })
})

describe('SCIM: create user', () => {
  const newUserEmail = 'scim-new-user@scim-e2e.example'

  it('should create user via SCIM', async () => {
    const res = await axios.post(
      `${scimUrl}/Users`,
      {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: newUserEmail,
        emails: [{ value: newUserEmail, primary: true }],
        active: true,
      },
      { headers: scimHeaders() },
    )

    expect(res.status).toBe(201)
    expect(res.data.userName).toBe(newUserEmail)
  })

  it('should appear in user list', async () => {
    const res = await axios.get(`${scimUrl}/Users`, { headers: scimHeaders() })
    const emails = res.data.Resources.map((r: any) => r.userName)

    expect(emails).toContain(newUserEmail)
  })
})

describe('SCIM: delete user', () => {
  beforeAll(async () => {
    await axios.patch(
      `${scimUrl}/Users/${encodeURIComponent(user2Email)}`,
      { Operations: [{ op: 'replace', path: 'active', value: true }] },
      { headers: scimHeaders() },
    ).catch(() => {})
  })

  it('should delete user from org', async () => {
    const res = await axios.delete(
      `${scimUrl}/Users/${encodeURIComponent(user2Email)}`,
      { headers: scimHeaders() },
    )

    expect(res.status).toBe(204)
  })

  it('should not appear in user list after delete', async () => {
    const res = await axios.get(`${scimUrl}/Users`, { headers: scimHeaders() })
    const emails = res.data.Resources.map((r: any) => r.userName)

    expect(emails).not.toContain(user2Email)
  })

  it('should return 404 for already deleted user', async () => {
    const res = await axios.delete(
      `${scimUrl}/Users/${encodeURIComponent(user2Email)}`,
      { headers: scimHeaders(), validateStatus: () => true },
    )
    expect(res.status).toBe(404)
  })
})

describe('SCIM: isolation between organizations', () => {
  it('should not see users from other organizations', async () => {
    const res = await axios.get(`${scimUrl}/Users`, { headers: scimHeaders() })
    const emails: string[] = res.data.Resources.map((r: any) => r.userName)

    for (const email of emails) {
      const member = await user1Api.organizations.fetchMembers(testOrgId)
        .then(members => members.find(m => m.email === email))
      expect(member).toBeTruthy()
    }
  })
})
