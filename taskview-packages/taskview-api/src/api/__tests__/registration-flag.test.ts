import axios from 'axios'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { TvApi } from '@/tv'
import { API_URL, DEFAULT_USER, DEFAULT_PASSWORD, initApi } from './init-api'

// The test stack runs the API with ALLOW_PUBLIC_REGISTRATION=false
// (set in docker/docker-compose.yml), so this suite asserts the
// closed-instance contract: strangers cannot create accounts through
// any public path, invited emails and existing users keep working.

const strangerEmail = `stranger-${Date.now()}@closed.example`
const invitedEmail = `invited-${Date.now()}@closed.example`

let user1Api: TvApi
let testOrgId: number

beforeAll(async () => {
  const init = await initApi()
  user1Api = init.$tvApi

  const org = await user1Api.organizations.create({ name: 'Closed Instance Org' })
  testOrgId = org.id
})

afterAll(async () => {
  await user1Api.organizations.delete(testOrgId).catch(() => {})
})

describe('ALLOW_PUBLIC_REGISTRATION=false: closed instance', () => {
  it('exposes publicRegistration=false in login options', async () => {
    const res = await axios.get(`${API_URL}/module/auth/login-options`)
    expect(res.data.publicRegistration).toBe(false)
  })

  it('rejects the registration endpoint for a stranger email', async () => {
    const res = await axios.post(
      `${API_URL}/module/auth/registration`,
      { email: strangerEmail, password: DEFAULT_PASSWORD, passwordRepeat: DEFAULT_PASSWORD },
      { validateStatus: () => true }
    )

    expect(res.status).toBe(403)
    expect(res.data.registrationDisabled).toBe(true)
  })

  it('magic-link refuses to create an account for a stranger email', async () => {
    const res = await axios.post(
      `${API_URL}/module/auth/send-login-code`,
      { email: strangerEmail },
      { validateStatus: () => true }
    )

    expect(res.status).toBe(403)
    expect(res.data.registrationDisabled).toBe(true)
  })

  it('a stranger email did not get an account (login by password fails)', async () => {
    const res = await axios.post(
      `${API_URL}/module/auth/login`,
      { login: strangerEmail, password: DEFAULT_PASSWORD },
      { validateStatus: () => true }
    )

    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('an email invited to an organization can request a login code', async () => {
    const member = await user1Api.organizations.addMember({
      organizationId: testOrgId,
      email: invitedEmail,
      role: 'member',
    })
    expect(member).toBeTruthy()

    const res = await axios.post(`${API_URL}/module/auth/send-login-code`, {
      email: invitedEmail,
    })

    expect(res.status).toBe(200)
  })

  it('invited email got a real account visible to the org owner', async () => {
    const members = await user1Api.organizations.fetchMembers(testOrgId)
    const invited = members.find((m: { email: string }) => m.email === invitedEmail)
    expect(invited).toBeTruthy()
  })

  it('existing users still sign in normally', async () => {
    const res = await axios.post(`${API_URL}/module/auth/login`, {
      login: DEFAULT_USER,
      password: DEFAULT_PASSWORD,
    })

    expect(res.data.access).toBeTruthy()
    expect(res.data.refresh).toBeTruthy()
  })
})
