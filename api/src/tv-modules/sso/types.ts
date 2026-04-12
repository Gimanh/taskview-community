import { type } from 'arktype'

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

  'defaultOrgRole?': 'string',
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

  'defaultOrgRole?': 'string',
  'emailDomainRestriction?': 'string',
})

export type SsoConfigArgUpdate = typeof SsoConfigArkTypeUpdate.infer
