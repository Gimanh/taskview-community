import axios from 'axios'
import type { Client } from 'pg'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { TvApi } from '@/tv'
import { API_URL, initApi } from './init-api'
import { openTestDb } from './test-db'
import type { LoginCodeRow } from './login-code.test.types'

// The emailed login code is 6 digits, so its redemption must be capped per code:
// after LOGIN_CODE_MAX_ATTEMPTS wrong guesses the code is dead until a new one is requested.
const LOGIN_CODE_MAX_ATTEMPTS = 5
const RESEND_COOLDOWN_MS = 60 * 1000
// LOGIN_CODE_HOURLY_LIMIT is not set on the test stack, so the default applies
const LOGIN_CODE_HOURLY_LIMIT = 5

let ownerApi: TvApi
let db: Client
let orgId: number
let emailSeq = 0

beforeAll(async () => {
  const init = await initApi()
  ownerApi = init.$tvApi
  db = await openTestDb()

  // The stack runs as a closed instance: only invited emails get an account through the login code
  const org = await ownerApi.organizations.create({ name: `Login code org ${Date.now()}` })
  orgId = org.id
})

afterAll(async () => {
  await ownerApi.organizations.delete(orgId).catch(() => {})
  await db.end()
})

/** A fresh account that has just been sent a login code. */
async function userWithPendingCode(): Promise<string> {
  const email = `login-code-${Date.now()}-${emailSeq++}@login-code.example`
  await ownerApi.organizations.addMember({ organizationId: orgId, email, role: 'member' })
  const res = await axios.post(`${API_URL}/module/auth/send-login-code`, { email })
  expect(res.status).toBe(200)
  return email
}

async function readCodeRow(email: string): Promise<LoginCodeRow> {
  const result = await db.query<LoginCodeRow>(
    'select remember_token, login_code_attempts from tv_auth.users where email = $1',
    [email]
  )
  expect(result.rows).toHaveLength(1)
  return result.rows[0]
}

async function readCode(email: string): Promise<string> {
  const row = await readCodeRow(email)
  expect(row.remember_token).toBeTruthy()
  return row.remember_token!.split(':')[0]
}

function wrongCodeFor(code: string): string {
  return code === '999999' ? '100000' : '999999'
}

async function requestCode(email: string) {
  return axios.post(`${API_URL}/module/auth/send-login-code`, { email }, { validateStatus: () => true })
}

async function countCodeRequests(email: string): Promise<number> {
  const result = await db.query<{ total: number }>(
    `select count(*)::int as total from tv_auth.login_code_requests r
     join tv_auth.users u on u.id = r.user_id where u.email = $1`,
    [email]
  )
  return result.rows[0].total
}

async function loginByCode(email: string, code: string) {
  return axios.post(`${API_URL}/module/auth/login-by-code`, { email, code }, { validateStatus: () => true })
}

/** Moves the issue time of the pending code into the past, as if `ageMs` had passed. */
async function ageCode(email: string, ageMs: number): Promise<void> {
  const row = await readCodeRow(email)
  const [code] = row.remember_token!.split(':')
  await db.query('update tv_auth.users set remember_token = $1 where email = $2', [`${code}:${Date.now() - ageMs}`, email])
}

describe('login by emailed code', () => {
  it('logs in with the right code and the code cannot be used twice', async () => {
    const email = await userWithPendingCode()
    const code = await readCode(email)

    const first = await loginByCode(email, code)
    expect(first.status).toBe(200)
    expect(first.data.access).toBeTruthy()
    expect(first.data.refresh).toBeTruthy()

    const replay = await loginByCode(email, code)
    expect(replay.status).toBe(400)
  })

  it('still accepts the right code after fewer wrong guesses than the limit', async () => {
    const email = await userWithPendingCode()
    const code = await readCode(email)

    for (let i = 0; i < LOGIN_CODE_MAX_ATTEMPTS - 1; i++) {
      const res = await loginByCode(email, wrongCodeFor(code))
      expect(res.status).toBe(400)
      expect(res.data.message).toBe('Invalid code')
    }

    const res = await loginByCode(email, code)
    expect(res.status).toBe(200)
    expect(res.data.access).toBeTruthy()
  })

  it('refuses the right code once the wrong guesses reached the limit', async () => {
    const email = await userWithPendingCode()
    const code = await readCode(email)

    for (let i = 0; i < LOGIN_CODE_MAX_ATTEMPTS; i++) {
      const res = await loginByCode(email, wrongCodeFor(code))
      expect(res.status).toBe(400)
    }

    const res = await loginByCode(email, code)
    expect(res.status).toBe(429)
    expect(res.data.access).toBeUndefined()

    const row = await readCodeRow(email)
    expect(row.login_code_attempts).toBe(LOGIN_CODE_MAX_ATTEMPTS + 1)
  })

  it('counts concurrent guesses one by one, so a burst cannot slip past the limit', async () => {
    const email = await userWithPendingCode()
    const code = await readCode(email)
    const burst = 30

    const responses = await Promise.all(
      Array.from({ length: burst }, () => loginByCode(email, wrongCodeFor(code)))
    )
    const statuses = responses.map(r => r.status)
    expect(statuses.filter(s => s === 400)).toHaveLength(LOGIN_CODE_MAX_ATTEMPTS)
    expect(statuses.filter(s => s === 429)).toHaveLength(burst - LOGIN_CODE_MAX_ATTEMPTS)

    const row = await readCodeRow(email)
    expect(row.login_code_attempts).toBe(burst)

    const res = await loginByCode(email, code)
    expect(res.status).toBe(429)
  })

  it('keeps the resend cooldown after the limit, then a new code gets a fresh attempt budget', async () => {
    const email = await userWithPendingCode()
    const oldCode = await readCode(email)

    for (let i = 0; i < LOGIN_CODE_MAX_ATTEMPTS; i++) {
      await loginByCode(email, wrongCodeFor(oldCode))
    }

    const tooSoon = await axios.post(`${API_URL}/module/auth/send-login-code`, { email }, { validateStatus: () => true })
    expect(tooSoon.status).toBe(429)

    await ageCode(email, RESEND_COOLDOWN_MS + 1000)

    const resent = await axios.post(`${API_URL}/module/auth/send-login-code`, { email })
    expect(resent.status).toBe(200)

    const row = await readCodeRow(email)
    expect(row.login_code_attempts).toBe(0)

    const newCode = await readCode(email)
    const res = await loginByCode(email, newCode)
    expect(res.status).toBe(200)
    expect(res.data.access).toBeTruthy()
  })

  it('refuses an expired code even when it is right', async () => {
    const email = await userWithPendingCode()
    const code = await readCode(email)
    await ageCode(email, 5 * 60 * 1000 + 1000)

    const res = await loginByCode(email, code)
    expect(res.status).toBe(400)
    expect(res.data.access).toBeUndefined()
  })

  it('answers an unknown email and a missing code exactly like a wrong code', async () => {
    const email = await userWithPendingCode()
    const code = await readCode(email)

    const wrong = await loginByCode(email, wrongCodeFor(code))
    const unknown = await loginByCode(`nobody-${Date.now()}@login-code.example`, '123456')

    const used = await userWithPendingCode()
    expect((await loginByCode(used, await readCode(used))).status).toBe(200)
    const noPending = await loginByCode(used, '123456')

    for (const res of [unknown, noPending]) {
      expect(res.status).toBe(wrong.status)
      expect(res.data).toEqual(wrong.data)
    }
  })

  describe('hourly limit on requested codes', () => {
    it('refuses a code beyond the hourly limit and says when to retry', async () => {
      const email = await userWithPendingCode()

      for (let i = 1; i < LOGIN_CODE_HOURLY_LIMIT; i++) {
        await ageCode(email, RESEND_COOLDOWN_MS + 1000)
        const res = await requestCode(email)
        expect(res.status).toBe(200)
      }
      expect(await countCodeRequests(email)).toBe(LOGIN_CODE_HOURLY_LIMIT)

      await ageCode(email, RESEND_COOLDOWN_MS + 1000)
      const lastCode = await readCode(email)
      const refused = await requestCode(email)
      expect(refused.status).toBe(429)
      expect(refused.data.retryAfter).toBeGreaterThan(RESEND_COOLDOWN_MS / 1000)
      expect(refused.data.retryAfter).toBeLessThanOrEqual(3600)
      expect(await countCodeRequests(email)).toBe(LOGIN_CODE_HOURLY_LIMIT)

      // A refused request leaves the last issued code in place
      expect(await readCode(email)).toBe(lastCode)
    })

    it('allows a new code again once the oldest one leaves the hour window', async () => {
      const email = await userWithPendingCode()

      for (let i = 1; i < LOGIN_CODE_HOURLY_LIMIT; i++) {
        await ageCode(email, RESEND_COOLDOWN_MS + 1000)
        expect((await requestCode(email)).status).toBe(200)
      }
      await ageCode(email, RESEND_COOLDOWN_MS + 1000)
      expect((await requestCode(email)).status).toBe(429)

      await db.query(
        `update tv_auth.login_code_requests set requested_at = requested_at - interval '61 minutes'
         where id = (select r.id from tv_auth.login_code_requests r
                     join tv_auth.users u on u.id = r.user_id
                     where u.email = $1 order by r.requested_at limit 1)`,
        [email]
      )

      const res = await requestCode(email)
      expect(res.status).toBe(200)
      const code = await readCode(email)
      expect((await loginByCode(email, code)).status).toBe(200)
    })

    it('does not let concurrent requests go past the limit', async () => {
      const email = await userWithPendingCode()
      await ageCode(email, RESEND_COOLDOWN_MS + 1000)

      const burst = 10
      const responses = await Promise.all(Array.from({ length: burst }, () => requestCode(email)))
      const statuses = responses.map(r => r.status)

      expect(statuses.filter(s => s === 200)).toHaveLength(LOGIN_CODE_HOURLY_LIMIT - 1)
      expect(statuses.filter(s => s === 429)).toHaveLength(burst - (LOGIN_CODE_HOURLY_LIMIT - 1))
      expect(await countCodeRequests(email)).toBe(LOGIN_CODE_HOURLY_LIMIT)
    })
  })
})
