import axios from 'axios'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { API_URL, initApi } from './init-api'
import { openTestDb } from './test-db'
import {
  authHeaders,
  bearerStatus,
  createSessionUser,
  decodeJwt,
  refreshWith,
  setPassword,
  signInWithPassword,
  signJwt,
  unsignedJwt,
} from './auth-test-helpers'
import type { AuthTestContext } from './auth-test-helpers.types'

// SESSION_MAX_AGE_DAYS is not set on the test stack, so the default applies
const SESSION_MAX_AGE_DAYS = 90
const PASSWORD = 'Tokens-pass-1!'

const ctx = {} as AuthTestContext

beforeAll(async () => {
  const init = await initApi()
  ctx.ownerApi = init.$tvApi
  ctx.db = await openTestDb()
  const org = await ctx.ownerApi.organizations.create({ name: `Auth tokens org ${Date.now()}` })
  ctx.orgId = org.id
})

afterAll(async () => {
  await ctx.ownerApi.organizations.delete(ctx.orgId).catch(() => {})
  await ctx.db.end()
})

describe('session tokens', () => {
  it('marks the access and the refresh token with their type', async () => {
    const user = await createSessionUser({ ctx, prefix: 'tok' })

    expect(decodeJwt(user.access).typ).toBe('access')
    expect(decodeJwt(user.refresh).typ).toBe('refresh')
  })

  it('refreshes by the refresh token into a working access token', async () => {
    const user = await createSessionUser({ ctx, prefix: 'tok' })

    const res = await refreshWith(user.refresh)

    expect(res.status).toBe(200)
    expect(await bearerStatus(res.data.access)).toBe(200)
  })

  it('does not accept a refresh token as a bearer token', async () => {
    const user = await createSessionUser({ ctx, prefix: 'tok' })

    expect(await bearerStatus(user.refresh)).toBe(401)
  })

  it('does not exchange an access token for new tokens', async () => {
    const user = await createSessionUser({ ctx, prefix: 'tok' })

    const res = await refreshWith(user.access)

    expect(res.status).toBe(400)
    expect(res.data?.access).toBeUndefined()
  })

  it('refuses a session token without a valid type, even while its session is alive', async () => {
    const user = await createSessionUser({ ctx, prefix: 'tok' })
    const { id, userData } = decodeJwt(user.access)
    const untyped = signJwt({ payload: { id, userData } })
    const unknownType = signJwt({ payload: { id, userData, typ: 'admin' } })

    for (const token of [untyped, unknownType]) {
      expect(await bearerStatus(token)).toBe(401)
      expect((await refreshWith(token)).status).toBe(400)
    }
    expect(await bearerStatus(user.access)).toBe(200)
  })

  it('refuses forged, unsigned, expired and malformed tokens', async () => {
    const user = await createSessionUser({ ctx, prefix: 'tok' })
    const { id, userData } = decodeJwt(user.access)

    const otherKey = signJwt({ payload: { id, userData, typ: 'access' }, key: 'not-the-server-key' })
    const unsigned = unsignedJwt({ id, userData, typ: 'access' })
    const expired = signJwt({ payload: { id, userData, typ: 'access' }, expiresIn: -60 })

    for (const token of [otherKey, unsigned, expired, 'not-a-jwt']) {
      expect(await bearerStatus(token), token).toBe(401)
    }
    for (const token of [otherKey, unsigned, 'not-a-jwt']) {
      expect((await refreshWith(token)).status, token).toBe(400)
    }
  })

  it('refuses a validly signed JWT that is not a session token', async () => {
    // e.g. the OAuth state of git integrations is signed with the same key
    const state = signJwt({ payload: { userId: 1, projectId: 1, provider: 'github', nonceHash: 'x' } })

    expect(await bearerStatus(state)).toBe(401)
    expect((await refreshWith(state)).status).toBe(400)
  })

  it('ends the session on logout: neither token works afterwards', async () => {
    const user = await createSessionUser({ ctx, prefix: 'tok' })

    const res = await axios.post(`${API_URL}/module/auth/logout`, {}, authHeaders(user.access))
    expect(res.status).toBe(204)

    expect(await bearerStatus(user.access)).toBe(401)
    expect((await refreshWith(user.refresh)).status).toBe(401)
  })

  it(`ends a session ${SESSION_MAX_AGE_DAYS} days after sign-in, however it was refreshed`, async () => {
    const user = await createSessionUser({ ctx, prefix: 'tok' })
    const fresh = await refreshWith(user.refresh)
    expect(fresh.status).toBe(200)

    const { id } = decodeJwt(user.access)
    await ctx.db.query(
      `update tv_auth.user_tokens set time_creation = now() - make_interval(days => $1) - interval '1 minute' where id = $2`,
      [SESSION_MAX_AGE_DAYS, id]
    )

    expect(await bearerStatus(user.access)).toBe(401)
    expect(await bearerStatus(fresh.data.access)).toBe(401)
    expect((await refreshWith(user.refresh)).status).toBe(401)
  })

  it('stops a blocked user: the session token and the password are refused', async () => {
    const user = await createSessionUser({ ctx, prefix: 'tok' })
    await setPassword({ ctx, user, password: PASSWORD })
    const signIn = await signInWithPassword(user.email, PASSWORD)
    expect(signIn.status).toBe(200)

    await ctx.db.query('update tv_auth.users set block = 1 where id = $1', [user.id])

    expect(await bearerStatus(signIn.data.access)).toBe(401)
    expect((await signInWithPassword(user.email, PASSWORD)).status).toBe(403)
  })
})

describe('password sign-in', () => {
  it('answers a wrong password and an unknown user the same way', async () => {
    const user = await createSessionUser({ ctx, prefix: 'pw' })
    await setPassword({ ctx, user, password: PASSWORD })

    const wrong = await signInWithPassword(user.email, 'Wrong-pass-1!')
    const unknown = await signInWithPassword(`nobody-${Date.now()}@auth.example`, PASSWORD)

    expect(wrong.status).toBe(400)
    expect(unknown.status).toBe(wrong.status)
    expect(unknown.data).toEqual(wrong.data)
  })

  it('does not confirm an email with a wrong code', async () => {
    const user = await createSessionUser({ ctx, prefix: 'pw' })
    await ctx.db.query(
      `update tv_auth.users set block = 1, confirm_email_code = 'right-code-123' where id = $1`,
      [user.id]
    )

    await axios.get(`${API_URL}/module/auth/confirm/email/wrong-code-123/login/${user.login}`, { validateStatus: () => true })
    const afterWrong = await ctx.db.query<{ block: number }>('select block from tv_auth.users where id = $1', [user.id])
    expect(afterWrong.rows[0].block).toBe(1)

    await axios.get(`${API_URL}/module/auth/confirm/email/right-code-123/login/${user.login}`, { validateStatus: () => true })
    const afterRight = await ctx.db.query<{ block: number }>('select block from tv_auth.users where id = $1', [user.id])
    expect(afterRight.rows[0].block).toBe(0)
  })
})
