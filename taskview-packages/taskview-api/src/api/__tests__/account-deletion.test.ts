import axios from 'axios'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { API_URL, initApi } from './init-api'
import { openTestDb } from './test-db'
import { authHeaders, bearerStatus, createSessionUser } from './auth-test-helpers'
import type { AuthTestContext, SessionUser } from './auth-test-helpers.types'

const ctx = {} as AuthTestContext

beforeAll(async () => {
  const init = await initApi()
  ctx.ownerApi = init.$tvApi
  ctx.db = await openTestDb()
  const org = await ctx.ownerApi.organizations.create({ name: `Account deletion org ${Date.now()}` })
  ctx.orgId = org.id
})

afterAll(async () => {
  await ctx.ownerApi.organizations.delete(ctx.orgId).catch(() => {})
  await ctx.db.end()
})

/** A user who has requested an account deletion code; the code is read from the DB. */
async function userWithDeletionCode(): Promise<{ user: SessionUser, code: string }> {
  const user = await createSessionUser({ ctx, prefix: 'del' })
  const sent = await axios.post(`${API_URL}/module/auth/delete/account/code`, {}, authHeaders(user.access))
  expect(sent.status).toBe(200)
  const row = await ctx.db.query<{ code: string }>(
    'select code from tv_auth.account_deletion where user_id = $1',
    [user.id]
  )
  return { user, code: row.rows[0].code }
}

async function deleteAccount(access: string, code: string) {
  return axios.post(`${API_URL}/module/auth/delete/account`, { code }, authHeaders(access))
}

async function userExists(userId: number): Promise<boolean> {
  const row = await ctx.db.query('select 1 from tv_auth.users where id = $1', [userId])
  return (row.rowCount ?? 0) > 0
}

const INVALID_CODE = { reason: 'invalid_or_expired_code' }
const CODE_TTL_S = 15 * 60

describe('deleting an account', () => {
  it('tells the settings page that deletion is allowed on this stack', async () => {
    const user = await createSessionUser({ ctx, prefix: 'del' })

    const res = await axios.get(`${API_URL}/module/auth/delete/account/options`, authHeaders(user.access))

    expect(res.status).toBe(200)
    expect(res.data).toEqual({ allowed: true })
  })

  it('keeps the account when the code is wrong', async () => {
    const { user } = await userWithDeletionCode()

    const res = await deleteAccount(user.access, 'wrong-code-0')

    expect(res.status).toBe(400)
    expect(res.data).toEqual(INVALID_CODE)
    expect(await userExists(user.id)).toBe(true)
  })

  it('keeps the account when the code is older than 15 minutes', async () => {
    const { user, code } = await userWithDeletionCode()
    await ctx.db.query(
      `update tv_auth.account_deletion set created_at = created_at - make_interval(secs => $1) where user_id = $2`,
      [CODE_TTL_S + 60, user.id]
    )

    const res = await deleteAccount(user.access, code)

    expect(res.status).toBe(400)
    expect(res.data).toEqual(INVALID_CODE)
    expect(await userExists(user.id)).toBe(true)
  })

  it('refuses a request without a code', async () => {
    const { user } = await userWithDeletionCode()

    const res = await axios.post(`${API_URL}/module/auth/delete/account`, {}, authHeaders(user.access))

    expect(res.status).toBe(400)
    expect(await userExists(user.id)).toBe(true)
  })

  it("does not delete either account with another user's code", async () => {
    const victim = await userWithDeletionCode()
    const attacker = await userWithDeletionCode()

    const res = await deleteAccount(attacker.user.access, victim.code)

    expect(res.status).toBe(400)
    expect(await userExists(victim.user.id)).toBe(true)
    expect(await userExists(attacker.user.id)).toBe(true)
  })

  it('a new code replaces the previous one', async () => {
    const { user, code: first } = await userWithDeletionCode()
    const again = await axios.post(`${API_URL}/module/auth/delete/account/code`, {}, authHeaders(user.access))
    expect(again.status).toBe(200)

    const res = await deleteAccount(user.access, first)

    expect(res.status).toBe(400)
    expect(await userExists(user.id)).toBe(true)
  })

  it('cannot be requested or confirmed with an API token', async () => {
    const { user, code } = await userWithDeletionCode()
    const created = await axios.post(`${API_URL}/module/api-tokens`, { name: 'Deletion test token' }, authHeaders(user.access))
    expect(created.status).toBe(200)
    const apiToken = created.data.response.token as string

    const sendCode = await axios.post(`${API_URL}/module/auth/delete/account/code`, {}, authHeaders(apiToken))
    const confirm = await deleteAccount(apiToken, code)

    expect(sendCode.status).toBe(403)
    expect(confirm.status).toBe(403)
    expect(await userExists(user.id)).toBe(true)
  })

  it('deletes the account with its own code and ends its session', async () => {
    const { user, code } = await userWithDeletionCode()

    const res = await deleteAccount(user.access, code)

    expect(res.status).toBe(200)
    expect(res.data).toEqual({ response: { del: true } })
    expect(await userExists(user.id)).toBe(false)
    expect(await bearerStatus(user.access)).toBe(401)
  })
})
