import { type } from 'arktype'
import type { SsoConfigsSchemaTypeForSelect } from 'taskview-db-schemas'
import type { UserDbRecord } from '../../types/auth.types'

export type SamlOptionsArgs = {
  config: SsoConfigsSchemaTypeForSelect
  mode: 'assertion' | 'response'
  callbackUrl: string
}

export const SsoProtocols = {
  SAML: 'saml',
  OIDC: 'oidc',
} as const

export type SsoProtocol = typeof SsoProtocols[keyof typeof SsoProtocols]

export const SsoConfigArkTypeCreate = type({
  organizationId: 'number',
  protocol: "'saml' | 'oidc'",
  displayName: 'string > 0',
  'enabled?': 'number',

  'samlEntryPoint?': 'string',
  'samlIssuer?': 'string',
  'samlCert?': 'string',
  'samlCallbackUrl?': 'string',
  'samlSigningKey?': 'string',
  'samlSigningCert?': 'string',
  'samlLogoutUrl?': 'string',

  'oidcIssuer?': 'string',
  'oidcClientId?': 'string',
  'oidcClientSecret?': 'string',
  'oidcCallbackUrl?': 'string',
  'oidcScope?': 'string',

  'defaultOrgRole?': "'admin' | 'member'",
  emailDomainRestriction: 'string > 0',
})

export type SsoConfigArgCreate = typeof SsoConfigArkTypeCreate.infer

export const SsoConfigArkTypeUpdate = type({
  'displayName?': 'string',
  'enabled?': 'number',

  'samlEntryPoint?': 'string',
  'samlIssuer?': 'string',
  'samlCert?': 'string',
  'samlCallbackUrl?': 'string',
  'samlSigningKey?': 'string',
  'samlSigningCert?': 'string',
  'samlLogoutUrl?': 'string',

  'oidcIssuer?': 'string',
  'oidcClientId?': 'string',
  'oidcClientSecret?': 'string',
  'oidcCallbackUrl?': 'string',
  'oidcScope?': 'string',

  'defaultOrgRole?': "'admin' | 'member'",
  'emailDomainRestriction?': 'string > 0',
})

export type SsoConfigArgUpdate = typeof SsoConfigArkTypeUpdate.infer

export type CheckSsoDomainProofArgs = {
  domain: string
  token: string
}

export type SsoDomainVerificationMethod = 'dns' | 'http' | 'trusted'

export type StartDomainVerificationResult = {
  token: string
  dnsRecord: string
  httpUrl: string
  isDomainVerified: boolean
  isDomainTrusted: boolean
}

export type CheckDomainVerificationResult = {
  verified: boolean
  method: SsoDomainVerificationMethod | null
}

export class SsoDomainNotVerifiedError extends Error {
  readonly code = 'domain_unverified'

  constructor() {
    super('SSO domain is not verified')
    this.name = 'SsoDomainNotVerifiedError'
  }
}

export type FindSsoConfigByDomainAndOrgArgs = {
  domain: string
  organizationId: number
}

export type FindSsoIdentityArgs = {
  ssoConfigId: number
  externalId: string
}

export type FindSsoIdentityByUserArgs = {
  ssoConfigId: number
  userId: number
}

export type UpsertSsoIdentityArgs = {
  userId: number
  ssoConfigId: number
  externalId: string
  email: string
}

export type ResolveSsoUserArgs = {
  ssoConfigId: number
  email: string
  externalId: string
  preferredUsername?: string
}

export type ApplySsoIdpEmailArgs = {
  user: UserDbRecord
  email: string
}

export type SsoCallbackError = 'authentication_failed' | 'email_in_use' | 'account_blocked'

export type ResolveSsoUserResult =
  | { ok: true, user: UserDbRecord }
  | { ok: false, error: SsoCallbackError }
