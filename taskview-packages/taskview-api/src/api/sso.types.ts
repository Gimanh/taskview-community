export type SsoConfig = {
  id: number
  organizationId: number
  protocol: 'saml' | 'oidc'
  displayName: string
  enabled: number

  samlEntryPoint: string | null
  samlIssuer: string | null
  samlCert: string | null
  samlCallbackUrl: string | null
  samlSigningKey: string | null
  samlSigningCert: string | null
  samlLogoutUrl: string | null

  oidcIssuer: string | null
  oidcClientId: string | null
  oidcClientSecret: string | null
  oidcCallbackUrl: string | null
  oidcScope: string | null

  defaultOrgRole: string
  emailDomainRestriction: string

  createdAt: string
  updatedAt: string
}

export type SsoConfigArgCreate = {
  organizationId: number
  protocol: 'saml' | 'oidc'
  displayName: string
  enabled?: number
  emailDomainRestriction: string

  samlEntryPoint?: string
  samlIssuer?: string
  samlCert?: string
  samlCallbackUrl?: string
  samlSigningKey?: string
  samlSigningCert?: string
  samlLogoutUrl?: string

  oidcIssuer?: string
  oidcClientId?: string
  oidcClientSecret?: string
  oidcCallbackUrl?: string
  oidcScope?: string

  defaultOrgRole?: string
}

export type SsoConfigArgUpdate = {
  displayName?: string
  enabled?: number
  emailDomainRestriction?: string

  samlEntryPoint?: string
  samlIssuer?: string
  samlCert?: string
  samlCallbackUrl?: string
  samlSigningKey?: string
  samlSigningCert?: string
  samlLogoutUrl?: string

  oidcIssuer?: string
  oidcClientId?: string
  oidcClientSecret?: string
  oidcCallbackUrl?: string
  oidcScope?: string

  defaultOrgRole?: string
}

export type SsoProviderPublic = {
  id: number
  displayName: string
  protocol: string
}
