import axios from 'axios'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { API_URL, initApi } from './init-api'
import { openTestDb } from './test-db'
import { authHeaders, bearerStatus, createSessionUser, setPassword, signInWithPassword } from './auth-test-helpers'
import type { AuthTestContext, SessionUser } from './auth-test-helpers.types'

// PASSWORD_CHANGE_CONFIRMATION is not set on the test stack, so the change is confirmed by an emailed code
const PASSWORD = 'Change-pass-1!'
const NEW_PASSWORD = 'Changed-pass-2!'
const CODE_TTL_S = 15 * 60

const ctx = {} as AuthTestContext

beforeAll(async () => {
  const init = await initApi()
  ctx.ownerApi = init.$tvApi
  ctx.db = await openTestDb()
  const org = await ctx.ownerApi.organizations.create({ name: `Password change org ${Date.now()}` })
  ctx.orgId = org.id
})

afterAll(async () => {
  await ctx.ownerApi.organizations.delete(ctx.orgId).catch(() => {})
  await ctx.db.end()
})

/** A user with a known password, signed in twice, who has just requested a password-change code. */
async function userAwaitingChange(): Promise<{ user: SessionUser, other: string, code: string }> {
  const created = await createSessionUser({ ctx, prefix: 'chg' })
  await setPassword({ ctx, user: created, password: PASSWORD })
  const current = await signInWithPassword(created.email, PASSWORD)
  const other = await signInWithPassword(created.email, PASSWORD)
  const user = { ...created, access: current.data.access, refresh: current.data.refresh }

  const sent = await axios.post(`${API_URL}/module/auth/password/change/code`, {}, authHeaders(user.access))
  expect(sent.status).toBe(200)
  const row = await ctx.db.query<{ remind_password_code: string }>(
    'select remind_password_code from tv_auth.users where id = $1',
    [user.id]
  )
  return { user, other: other.data.access, code: row.rows[0].remind_password_code }
}

async function changePassword(access: string, code: string) {
  return axios.post(
    `${API_URL}/module/auth/password/change`,
    { code, password: NEW_PASSWORD, passwordRepeat: NEW_PASSWORD },
    authHeaders(access)
  )
}

async function passwordHash(userId: number): Promise<string> {
  const row = await ctx.db.query<{ password: string }>('select password from tv_auth.users where id = $1', [userId])
  return row.rows[0].password
}

describe('changing the password while signed in', () => {
  it('reports the confirmation mode', async () => {
    const user = await createSessionUser({ ctx, prefix: 'chg' })

    const res = await axios.get(`${API_URL}/module/auth/password/change/mode`, authHeaders(user.access))

    expect(res.status).toBe(200)
    expect(res.data).toEqual({ mode: 'email' })
  })

  it('changes the password with the emailed code, ending the other sessions only', async () => {
    const { user, other, code } = await userAwaitingChange()

    const res = await changePassword(user.access, code)

    expect(res.status).toBe(200)
    expect(await bearerStatus(other)).toBe(401)
    expect(await bearerStatus(user.access)).toBe(200)
    expect((await signInWithPassword(user.email, NEW_PASSWORD)).status).toBe(200)
    expect((await signInWithPassword(user.email, PASSWORD)).status).toBe(400)
  })

  it('refuses a wrong code', async () => {
    const { user, other } = await userAwaitingChange()
    const before = await passwordHash(user.id)

    const res = await changePassword(user.access, 'wrong-code-0')

    expect(res.status).toBe(400)
    expect(await passwordHash(user.id)).toBe(before)
    expect(await bearerStatus(other)).toBe(200)
  })

  it('refuses a code older than 15 minutes', async () => {
    const { user, code } = await userAwaitingChange()
    const before = await passwordHash(user.id)
    await ctx.db.query(
      'update tv_auth.users set remind_password_time = remind_password_time - $1 where id = $2',
      [CODE_TTL_S + 60, user.id]
    )

    const res = await changePassword(user.access, code)

    expect(res.status).toBe(400)
    expect(await passwordHash(user.id)).toBe(before)
  })

  it('accepts a code once', async () => {
    const { user, code } = await userAwaitingChange()

    expect((await changePassword(user.access, code)).status).toBe(200)
    expect((await changePassword(user.access, code)).status).toBe(400)
  })

  it('makes the user wait a minute before another code', async () => {
    const { user } = await userAwaitingChange()

    const res = await axios.post(`${API_URL}/module/auth/password/change/code`, {}, authHeaders(user.access))

    expect(res.status).toBe(429)
    expect(res.data.retryAfter).toBeGreaterThan(0)
  })

  it("does not accept another user's code", async () => {
    const victim = await userAwaitingChange()
    const attacker = await userAwaitingChange()
    const before = await passwordHash(attacker.user.id)

    const res = await changePassword(attacker.user.access, victim.code)

    expect(res.status).toBe(400)
    expect(await passwordHash(attacker.user.id)).toBe(before)
  })
})

describe('changing the default credentials', () => {
  it('is refused to any account but the seeded default one', async () => {
    const created = await createSessionUser({ ctx, prefix: 'chg' })
    await setPassword({ ctx, user: created, password: PASSWORD })
    const signIn = await signInWithPassword(created.email, PASSWORD)

    const res = await axios.post(
      `${API_URL}/module/auth/credentials/change`,
      { currentPassword: PASSWORD, login: `taken${Date.now()}`, email: `taken${Date.now()}@auth.example`, password: NEW_PASSWORD, passwordRepeat: NEW_PASSWORD },
      authHeaders(signIn.data.access)
    )

    expect(res.status).toBe(403)
    expect((await signInWithPassword(created.email, PASSWORD)).status).toBe(200)
  })
})
