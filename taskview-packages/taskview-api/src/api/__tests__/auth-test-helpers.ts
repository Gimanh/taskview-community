import axios from 'axios'
import { createHmac } from 'crypto'
import fs from 'fs'
import path from 'path'
import { expect } from 'vitest'
import { API_URL } from './init-api'
import type { CreateSessionUserArgs, SessionUser, SetPasswordArgs, SignJwtArgs } from './auth-test-helpers.types'

export const noThrow = { validateStatus: () => true }

let emailSeq = 0

function readStackEnv(): Record<string, string> {
  const content = fs.readFileSync(path.resolve(__dirname, 'docker/.env.taskview'), 'utf8')
  return Object.fromEntries(
    content
      .split('\n')
      .filter(line => line.includes('=') && !line.startsWith('#'))
      .map((line) => {
        const [key, ...rest] = line.split('=')
        return [key.trim(), rest.join('=').trim()]
      })
  )
}

/** The JWT key of the test stack, to forge tokens the API must accept or refuse. */
export const STACK_JWT_SIGN = readStackEnv().JWT_SIGN

/**
 * A fresh account with one signed-in session. The stack is a closed instance, so the
 * email is invited to the context org first; the emailed login code is read from the DB.
 */
export async function createSessionUser(args: CreateSessionUserArgs): Promise<SessionUser> {
  const email = `${args.prefix}-${Date.now()}-${emailSeq++}@auth.example`
  await args.ctx.ownerApi.organizations.addMember({ organizationId: args.ctx.orgId, email, role: 'member' })
  expect((await axios.post(`${API_URL}/module/auth/send-login-code`, { email })).status).toBe(200)

  const user = await args.ctx.db.query<{ id: number, login: string, remember_token: string }>(
    'select id, login, remember_token from tv_auth.users where email = $1',
    [email]
  )
  const code = user.rows[0].remember_token.split(':')[0]
  const session = await axios.post(`${API_URL}/module/auth/login-by-code`, { email, code })
  expect(session.status).toBe(200)

  return {
    id: user.rows[0].id,
    email,
    login: user.rows[0].login,
    access: session.data.access,
    refresh: session.data.refresh,
  }
}

/** Gives a code-created account a known password through the reset flow. */
export async function setPassword(args: SetPasswordArgs): Promise<void> {
  expect((await axios.post(`${API_URL}/module/auth/email/recovery`, { email: args.user.email })).status).toBe(200)
  const row = await args.ctx.db.query<{ remind_password_code: string }>(
    'select remind_password_code from tv_auth.users where id = $1',
    [args.user.id]
  )
  const reset = await axios.post(`${API_URL}/module/auth/password/reset`, {
    login: args.user.login,
    code: row.rows[0].remind_password_code,
    password: args.password,
    passwordRepeat: args.password,
  })
  expect(reset.status).toBe(200)
}

export async function signInWithPassword(login: string, password: string) {
  return axios.post(`${API_URL}/module/auth/login`, { login, password }, noThrow)
}

/** Status of a request that needs a signed-in session: 200 when the token is accepted as a bearer. */
export async function bearerStatus(token: string): Promise<number> {
  const res = await axios.get(`${API_URL}/module/auth/password/change/mode`, {
    headers: { Authorization: `Bearer ${token}` },
    ...noThrow,
  })
  return res.status
}

export async function refreshWith(token: string) {
  return axios.post(`${API_URL}/module/auth/refresh/token`, { refreshToken: token }, noThrow)
}

export function authHeaders(token: string) {
  return { headers: { Authorization: `Bearer ${token}` }, ...noThrow }
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url')
}

/** An HS256 JWT, signed like the API signs its session tokens unless another key is given. */
export function signJwt(args: SignJwtArgs): string {
  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64Url(JSON.stringify({ ...args.payload, iat: now, exp: now + (args.expiresIn ?? 3600) }))
  const signature = createHmac('sha256', args.key ?? STACK_JWT_SIGN).update(`${header}.${body}`).digest()
  return `${header}.${body}.${base64Url(signature)}`
}

/** An unsigned JWT with alg "none". */
export function unsignedJwt(payload: Record<string, unknown>): string {
  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const body = base64Url(JSON.stringify({ ...payload, iat: now, exp: now + 3600 }))
  return `${header}.${body}.`
}

/** The payload of a JWT, without verifying it. */
export function decodeJwt(token: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
}
