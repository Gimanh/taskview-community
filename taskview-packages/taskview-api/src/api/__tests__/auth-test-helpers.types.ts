import type { Client } from 'pg'
import type { TvApi } from '@/tv'

export type AuthTestContext = {
  ownerApi: TvApi
  db: Client
  orgId: number
}

export type SessionUser = {
  id: number
  email: string
  login: string
  access: string
  refresh: string
}

export type CreateSessionUserArgs = {
  ctx: AuthTestContext
  /** short: tv_auth.users.email is varchar(50) */
  prefix: string
}

export type SetPasswordArgs = {
  ctx: AuthTestContext
  user: SessionUser
  password: string
}

export type SignJwtArgs = {
  payload: Record<string, unknown>
  /** defaults to the stack's JWT_SIGN */
  key?: string
  /** seconds from now; negative for an already expired token */
  expiresIn?: number
}
