import axios from 'axios'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { API_URL, initApi } from './init-api'
import { openTestDb } from './test-db'
import { authHeaders, bearerStatus, createSessionUser, decodeJwt, setPassword, signInWithPassword } from './auth-test-helpers'
import type { AuthTestContext, SessionUser } from './auth-test-helpers.types'

const PASSWORD = 'Sessions-pass-1!'

const ctx = {} as AuthTestContext

beforeAll(async () => {
  const init = await initApi()
  ctx.ownerApi = init.$tvApi
  ctx.db = await openTestDb()
  const org = await ctx.ownerApi.organizations.create({ name: `Auth sessions org ${Date.now()}` })
  ctx.orgId = org.id
})

afterAll(async () => {
  await ctx.ownerApi.organizations.delete(ctx.orgId).catch(() => {})
  await ctx.db.end()
})

/** A user signed in twice: the session from the login code and a second one by password. */
async function userWithTwoSessions(): Promise<{ user: SessionUser, second: string }> {
  const user = await createSessionUser({ ctx, prefix: 'ses' })
  await setPassword({ ctx, user, password: PASSWORD })
  // The reset ended the first session; sign in twice again
  const first = await signInWithPassword(user.email, PASSWORD)
  const second = await signInWithPassword(user.email, PASSWORD)
  expect(first.status).toBe(200)
  expect(second.status).toBe(200)
  return { user: { ...user, access: first.data.access, refresh: first.data.refresh }, second: second.data.access }
}

function sessionId(token: string): number {
  return decodeJwt(token).id as number
}

describe('managing sign-in sessions', () => {
  it('lists the sessions of the caller only, marking the current one', async () => {
    const { user, second } = await userWithTwoSessions()
    const stranger = await createSessionUser({ ctx, prefix: 'ses' })

    const res = await axios.get(`${API_URL}/module/sessions`, authHeaders(user.access))

    expect(res.status).toBe(200)
    const ids = res.data.response.map((s: { id: number }) => s.id)
    expect(ids).toEqual(expect.arrayContaining([sessionId(user.access), sessionId(second)]))
    expect(ids).not.toContain(sessionId(stranger.access))
    const current = res.data.response.filter((s: { isCurrent: boolean }) => s.isCurrent)
    expect(current.map((s: { id: number }) => s.id)).toEqual([sessionId(user.access)])
  })

  it("cannot end another user's session", async () => {
    const attacker = await createSessionUser({ ctx, prefix: 'ses' })
    const victim = await createSessionUser({ ctx, prefix: 'ses' })

    await axios.delete(`${API_URL}/module/sessions`, { ...authHeaders(attacker.access), data: { id: sessionId(victim.access) } })

    expect(await bearerStatus(victim.access)).toBe(200)
  })

  it('cannot end the current session through the session list', async () => {
    const user = await createSessionUser({ ctx, prefix: 'ses' })

    const res = await axios.delete(`${API_URL}/module/sessions`, { ...authHeaders(user.access), data: { id: sessionId(user.access) } })

    expect(res.status).toBe(400)
    expect(await bearerStatus(user.access)).toBe(200)
  })

  it('ends one other session of the caller', async () => {
    const { user, second } = await userWithTwoSessions()

    const res = await axios.delete(`${API_URL}/module/sessions`, { ...authHeaders(user.access), data: { id: sessionId(second) } })

    expect(res.status).toBe(200)
    expect(await bearerStatus(second)).toBe(401)
    expect(await bearerStatus(user.access)).toBe(200)
  })

  it('signs out everywhere else while keeping the current session', async () => {
    const { user, second } = await userWithTwoSessions()

    const res = await axios.delete(`${API_URL}/module/sessions/all`, authHeaders(user.access))

    expect(res.status).toBe(200)
    expect(await bearerStatus(second)).toBe(401)
    expect(await bearerStatus(user.access)).toBe(200)
  })
})

describe('account endpoints refuse API tokens', () => {
  it('sessions, password change and credentials change answer 403 to an API token', async () => {
    const user = await createSessionUser({ ctx, prefix: 'ses' })
    const created = await axios.post(`${API_URL}/module/api-tokens`, { name: 'Auth test token' }, authHeaders(user.access))
    expect(created.status).toBe(200)
    const apiToken = created.data.response.token as string
    expect(apiToken).toMatch(/^tvk_/)

    const calls = [
      axios.get(`${API_URL}/module/sessions`, authHeaders(apiToken)),
      axios.delete(`${API_URL}/module/sessions/all`, authHeaders(apiToken)),
      axios.post(`${API_URL}/module/auth/password/change/code`, {}, authHeaders(apiToken)),
      axios.post(
        `${API_URL}/module/auth/password/change`,
        { code: 'x', password: 'Api-pass-1!', passwordRepeat: 'Api-pass-1!' },
        authHeaders(apiToken)
      ),
      axios.post(
        `${API_URL}/module/auth/credentials/change`,
        { currentPassword: 'x', login: 'apitoken', email: 'apitoken@auth.example', password: 'Api-pass-1!', passwordRepeat: 'Api-pass-1!' },
        authHeaders(apiToken)
      ),
    ]
    for (const res of await Promise.all(calls)) {
      expect(res.status, `${res.config.method} ${res.config.url}`).toBe(403)
    }
    expect(await bearerStatus(user.access)).toBe(200)
  })
})
