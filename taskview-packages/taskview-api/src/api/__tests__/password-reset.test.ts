import axios from 'axios'
import type { Client } from 'pg'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { TvApi } from '@/tv'
import { API_URL, initApi } from './init-api'
import { openTestDb } from './test-db'
import type { ResetCodeRow, UserWithSession } from './password-reset.test.types'

// A password reset is the account-recovery step: it must end every existing session,
// and the emailed reset code must expire like the password-change code does.
const RESET_CODE_TTL_S = 15 * 60
const NEW_PASSWORD = 'Reset-pass-1!'
const INVALID_CODE = { reason: 'invalid_or_expired_code' }

let ownerApi: TvApi
let db: Client
let orgId: number
let emailSeq = 0

beforeAll(async () => {
  const init = await initApi()
  ownerApi = init.$tvApi
  db = await openTestDb()

  // The stack runs as a closed instance: only invited emails get an account
  const org = await ownerApi.organizations.create({ name: `Password reset org ${Date.now()}` })
  orgId = org.id
})

afterAll(async () => {
  await ownerApi.organizations.delete(orgId).catch(() => {})
  await db.end()
})

const noThrow = { validateStatus: () => true }

/** A fresh account with one logged-in session, as an attacker holding a stolen token would have. */
async function userWithSession(): Promise<UserWithSession> {
  // tv_auth.users.email is varchar(50)
  const email = `pwr-${Date.now()}-${emailSeq++}@pwreset.example`
  await ownerApi.organizations.addMember({ organizationId: orgId, email, role: 'member' })
  expect((await axios.post(`${API_URL}/module/auth/send-login-code`, { email })).status).toBe(200)

  const user = await db.query<{ login: string, remember_token: string }>(
    'select login, remember_token from tv_auth.users where email = $1',
    [email]
  )
  const code = user.rows[0].remember_token.split(':')[0]
  const session = await axios.post(`${API_URL}/module/auth/login-by-code`, { email, code })
  expect(session.status).toBe(200)

  return { email, login: user.rows[0].login, access: session.data.access, refresh: session.data.refresh }
}

async function readResetCode(email: string): Promise<ResetCodeRow> {
  const result = await db.query<ResetCodeRow>(
    'select remind_password_code, remind_password_time, password from tv_auth.users where email = $1',
    [email]
  )
  expect(result.rows).toHaveLength(1)
  return result.rows[0]
}

async function requestReset(email: string): Promise<string> {
  expect((await axios.post(`${API_URL}/module/auth/email/recovery`, { email })).status).toBe(200)
  const row = await readResetCode(email)
  expect(row.remind_password_code).toBeTruthy()
  return row.remind_password_code!
}

async function resetPassword(login: string, code: string, password = NEW_PASSWORD) {
  return axios.post(
    `${API_URL}/module/auth/password/reset`,
    { login, code, password, passwordRepeat: password },
    noThrow
  )
}

async function isAccessTokenValid(access: string): Promise<number> {
  const res = await axios.get(`${API_URL}/module/auth/password/change/mode`, {
    headers: { Authorization: `Bearer ${access}` },
    ...noThrow,
  })
  return res.status
}

async function refresh(refreshToken: string): Promise<number> {
  const res = await axios.post(`${API_URL}/module/auth/refresh/token`, { refreshToken }, noThrow)
  return res.status
}

describe('password reset by emailed code', () => {
  it('ends every existing session, and the new password works', async () => {
    const user = await userWithSession()
    expect(await isAccessTokenValid(user.access)).toBe(200)
    expect(await refresh(user.refresh)).toBe(200)

    const code = await requestReset(user.email)
    const res = await resetPassword(user.login, code)
    expect(res.status).toBe(200)

    expect(await isAccessTokenValid(user.access)).toBe(401)
    expect(await refresh(user.refresh)).toBe(401)

    const login = await axios.post(`${API_URL}/module/auth/login`, { login: user.email, password: NEW_PASSWORD }, noThrow)
    expect(login.status).toBe(200)
    expect(login.data.access).toBeTruthy()
  })

  it('refuses a code older than the reset window', async () => {
    const user = await userWithSession()
    const code = await requestReset(user.email)
    const before = await readResetCode(user.email)
    await db.query(
      'update tv_auth.users set remind_password_time = remind_password_time - $1 where email = $2',
      [RESET_CODE_TTL_S + 60, user.email]
    )

    const res = await resetPassword(user.login, code)

    expect(res.status).toBe(400)
    expect(res.data).toEqual(INVALID_CODE)
    expect((await readResetCode(user.email)).password).toBe(before.password)
    expect(await isAccessTokenValid(user.access)).toBe(200)
  })

  it('accepts a code once', async () => {
    const user = await userWithSession()
    const code = await requestReset(user.email)

    expect((await resetPassword(user.login, code)).status).toBe(200)
    const after = await readResetCode(user.email)

    const replay = await resetPassword(user.login, code, 'Another-pass-2!')
    expect(replay.status).toBe(400)
    expect(replay.data).toEqual(INVALID_CODE)
    expect((await readResetCode(user.email)).password).toBe(after.password)
  })

  it('lets only one of two concurrent requests with the same code through', async () => {
    const user = await userWithSession()
    const code = await requestReset(user.email)

    const responses = await Promise.all([
      resetPassword(user.login, code, 'Concurrent-pass-1!'),
      resetPassword(user.login, code, 'Concurrent-pass-2!'),
    ])

    expect(responses.map(r => r.status).sort()).toEqual([200, 400])
  })

  it('refuses a wrong code', async () => {
    const user = await userWithSession()
    await requestReset(user.email)
    const before = await readResetCode(user.email)

    const res = await resetPassword(user.login, 'wrong-code-000000')

    expect(res.status).toBe(400)
    expect(res.data).toEqual(INVALID_CODE)
    expect((await readResetCode(user.email)).password).toBe(before.password)
  })

  it('refuses a password shorter than the other password flows allow, keeping the code usable', async () => {
    const user = await userWithSession()
    const code = await requestReset(user.email)

    const short = await resetPassword(user.login, code, '12345')
    expect(short.status).toBe(400)
    expect(short.data).not.toEqual(INVALID_CODE)

    expect((await resetPassword(user.login, code)).status).toBe(200)
  })

  it('answers an unknown login like a wrong code', async () => {
    const res = await resetPassword(`nobody${Date.now()}`, 'any-code-000000')

    expect(res.status).toBe(400)
    expect(res.data).toEqual(INVALID_CODE)
  })
})
