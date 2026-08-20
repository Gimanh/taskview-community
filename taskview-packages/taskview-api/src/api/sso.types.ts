export type SsoConfig = {
  id: number
  organizationId: number
  protocol: 'saml' | 'oidc'
  displayName: string
  enabled: number

  samlEntryPoint: string | null
  samlIssuer: string | null
  samlCallbackUrl: string | null
  samlLogoutUrl: string | null

  oidcIssuer: string | null
  oidcClientId: string | null
  oidcCallbackUrl: string | null
  oidcScope: string | null

  defaultOrgRole: string
  emailDomainRestriction: string

  scimEnabled: number

  hasSamlCert: boolean
  hasSamlSigningKey: boolean
  hasSamlSigningCert: boolean
  hasOidcClientSecret: boolean
  hasScimToken: boolean
  domainVerifyToken: string | null
  domainVerifiedAt: string | null
  isDomainVerified: boolean
  isDomainTrusted: boolean
  domainVerifyDnsRecord: string | null
  domainVerifyHttpUrl: string

  createdAt: string
  updatedAt: string
}

export type SsoDomainVerificationStart = {
  token: string
  dnsRecord: string
  httpUrl: string
  isDomainVerified: boolean
  isDomainTrusted: boolean
}

export type SsoDomainVerificationCheck = {
  verified: boolean
  method: 'dns' | 'http' | 'trusted' | null
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

export type SsoPublicUrls = {
  apiBaseUrl: string
  callbackUrlTemplate: string
  scimEndpointUrl: string
  apiPublicUrlConfigured: boolean
}
