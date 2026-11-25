import axios from 'axios'
import type { Client } from 'pg'
import { API_URL } from './init-api'
import { noThrow } from './auth-test-helpers'
import type { SessionUser } from './auth-test-helpers.types'
import type { OnboardingFinishRawArgs, OnboardingRawResult, OnboardingRow } from './onboarding-test-helpers.types'

export const ONBOARDING_URL = `${API_URL}/module/onboarding`

function bearer(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function getOnboardingRaw(token?: string): Promise<OnboardingRawResult> {
  const res = await axios.get(ONBOARDING_URL, { headers: bearer(token), ...noThrow })
  return { status: res.status, data: res.data }
}

export async function finishOnboardingRaw(args: OnboardingFinishRawArgs): Promise<OnboardingRawResult> {
  const res = await axios.post(`${ONBOARDING_URL}/finish`, args.body, {
    headers: { ...bearer(args.token), 'Content-Type': 'application/json' },
    ...(args.raw ? { transformRequest: [(data: unknown) => data] } : {}),
    ...noThrow,
  })
  return { status: res.status, data: res.data }
}

/** The stored answers of one user: no row means the tour is still offered */
export async function onboardingRows(db: Client, userId: number): Promise<OnboardingRow[]> {
  const result = await db.query<OnboardingRow>('select status from tv_auth.user_onboarding where user_id = $1', [userId])
  return result.rows
}

export async function deleteUsers(db: Client, userIds: number[]): Promise<void> {
  await db.query('delete from tv_auth.users where id = any($1::int[])', [userIds])
}

/** One more signed-in session of an existing account, through the emailed login code */
export async function createSecondSession(db: Client, user: SessionUser): Promise<string> {
  const sent = await axios.post(`${API_URL}/module/auth/send-login-code`, { email: user.email }, noThrow)
  if (sent.status !== 200) throw new Error(`send-login-code answered ${sent.status}`)
  const row = await db.query<{ remember_token: string }>('select remember_token from tv_auth.users where id = $1', [user.id])
  const code = row.rows[0].remember_token.split(':')[0]
  const session = await axios.post(`${API_URL}/module/auth/login-by-code`, { email: user.email, code }, noThrow)
  if (session.status !== 200) throw new Error(`login-by-code answered ${session.status}`)
  return session.data.access
}
