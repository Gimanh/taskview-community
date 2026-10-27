import axios from 'axios'
import type { Client } from 'pg'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { TvApi } from '@/tv'
import { API_URL, initApi } from './init-api'
import { openTestDb } from './test-db'
import type { LoginCaseUser } from './login-case.test.types'

// Login and email are stored lowercase and looked up lowercase, so the case a user types
// never matters — including for rows written before the rule, which may still be mixed case.
const PASSWORD = 'Case-pass-1!'

let ownerApi: TvApi
let db: Client
let orgId: number
let emailSeq = 0

beforeAll(async () => {
  const init = await initApi()
  ownerApi = init.$tvApi
  db = await openTestDb()

  // The stack runs as a closed instance: only invited emails get an account
  const org = await ownerApi.organizations.create({ name: `Login case org ${Date.now()}` })
  orgId = org.id
})

afterAll(async () => {
  await ownerApi.organizations.delete(orgId).catch(() => {})
  await db.end()
})

const noThrow = { validateStatus: () => true }

async function readUser(email: string): Promise<LoginCaseUser> {
  const result = await db.query<LoginCaseUser>(
    'select id, login, email, remind_password_code from tv_auth.users where lower(email) = lower($1)',
    [email]
  )
  expect(result.rows).toHaveLength(1)
  return result.rows[0]
}

/** An account created by the emailed login code, which generates its own login, with a known password. */
async function codeCreatedUserWithPassword(): Promise<LoginCaseUser> {
  // tv_auth.users.email is varchar(50)
  const email = `lc-${Date.now()}-${emailSeq++}@logincase.example`
  await ownerApi.organizations.addMember({ organizationId: orgId, email, role: 'member' })
  expect((await axios.post(`${API_URL}/module/auth/send-login-code`, { email })).status).toBe(200)

  expect((await axios.post(`${API_URL}/module/auth/email/recovery`, { email })).status).toBe(200)
  const user = await readUser(email)
  const reset = await axios.post(`${API_URL}/module/auth/password/reset`, {
    login: user.login,
    code: user.remind_password_code,
    password: PASSWORD,
    passwordRepeat: PASSWORD,
  })
  expect(reset.status).toBe(200)
  return readUser(email)
}

async function loginWithPassword(login: string) {
  return axios.post(`${API_URL}/module/auth/login`, { login, password: PASSWORD }, noThrow)
}

describe('login and email are case-insensitive', () => {
  it('stores the generated login of a code-created account in lowercase', async () => {
    const user = await codeCreatedUserWithPassword()
    expect(user.login).toBe(user.login.toLowerCase())
    expect(user.email).toBe(user.email.toLowerCase())
  })

  it('signs in with the password by login, in any case', async () => {
    const user = await codeCreatedUserWithPassword()

    expect((await loginWithPassword(user.login)).status).toBe(200)
    expect((await loginWithPassword(user.login.toUpperCase())).status).toBe(200)
  })

  it('still finds a legacy mixed-case login and email', async () => {
    const user = await codeCreatedUserWithPassword()
    const legacyLogin = `Lc${user.id}MiX`
    const legacyEmail = `Lc-Legacy-${user.id}@LoginCase.Example`
    await db.query('update tv_auth.users set login = $1, email = $2 where id = $3', [legacyLogin, legacyEmail, user.id])

    expect((await loginWithPassword(legacyLogin)).status).toBe(200)
    expect((await loginWithPassword(legacyLogin.toLowerCase())).status).toBe(200)
    expect((await loginWithPassword(legacyEmail.toLowerCase())).status).toBe(200)
  })

  it('delivers a working login code to a legacy mixed-case email', async () => {
    const user = await codeCreatedUserWithPassword()
    const legacyEmail = `Lc-Code-${user.id}@LoginCase.Example`
    await db.query(
      'update tv_auth.users set email = $1, remember_token = null where id = $2',
      [legacyEmail, user.id]
    )

    // The login form sends what the user types; the API lowercases it
    const sent = await axios.post(`${API_URL}/module/auth/send-login-code`, { email: legacyEmail }, noThrow)
    expect(sent.status).toBe(200)

    const row = await db.query<{ remember_token: string | null }>(
      'select remember_token from tv_auth.users where id = $1',
      [user.id]
    )
    expect(row.rows[0].remember_token).toBeTruthy()
    const code = row.rows[0].remember_token!.split(':')[0]

    const res = await axios.post(`${API_URL}/module/auth/login-by-code`, { email: legacyEmail, code }, noThrow)
    expect(res.status).toBe(200)
    expect(res.data.access).toBeTruthy()
  })
})
