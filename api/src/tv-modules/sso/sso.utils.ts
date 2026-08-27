import { randomBytes } from 'crypto'
import { resolveTxt } from 'node:dns/promises'
import type { SsoConfigsSchemaTypeForSelect } from 'taskview-db-schemas'
import { decryptField } from '../../utils/crypto'
import { generateString } from '../../utils/helpers'
import type { CheckSsoDomainProofArgs, SsoDomainVerificationMethod } from './types'

export const SSO_SECRET_FIELDS = ['samlCert', 'samlSigningKey', 'samlSigningCert', 'oidcClientSecret'] as const

export const SSO_DOMAIN_TXT_PREFIX = 'taskview-sso-verify='
export const SSO_DOMAIN_WELL_KNOWN_PATH = '/.well-known/taskview-sso-verify.txt'

export function generateDomainVerifyToken(): string {
  return `tvdom_${randomBytes(32).toString('hex')}`
}

const SAML_EMAIL_NAMEID_FORMAT = 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
const SAML_EMAIL_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'

export function deriveSamlEmail(profile: Record<string, unknown>): string | null {
  const fromAttribute = profile.email ?? profile[SAML_EMAIL_CLAIM]
  if (typeof fromAttribute === 'string' && fromAttribute.trim()) {
    return fromAttribute.trim().toLowerCase()
  }
  if (profile.nameIDFormat === SAML_EMAIL_NAMEID_FORMAT
    && typeof profile.nameID === 'string' && profile.nameID.trim()) {
    return profile.nameID.trim().toLowerCase()
  }
  return null
}

export function trustedSsoDomains(): string[] {
  const raw = process.env.SSO_TRUSTED_DOMAINS
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean)
}

export function isTrustedSsoDomain(domain: string): boolean {
  return trustedSsoDomains().includes(domain.trim().toLowerCase())
}

export function isSsoDomainVerified(config: SsoConfigsSchemaTypeForSelect): boolean {
  if (isTrustedSsoDomain(config.emailDomainRestriction)) return true
  return !!config.domainVerifiedAt
}

export function ssoDomainVerifyHttpUrl(domain: string): string {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  return `${protocol}://${domain}${SSO_DOMAIN_WELL_KNOWN_PATH}`
}

export function ssoDomainVerifyDnsRecord(token: string): string {
  return `${SSO_DOMAIN_TXT_PREFIX}${token}`
}

export function toClientSsoConfig(config: SsoConfigsSchemaTypeForSelect) {
  const { samlCert, samlSigningKey, samlSigningCert, oidcClientSecret, scimToken, ...safe } = config
  const token = config.domainVerifyToken
  return {
    ...safe,
    hasSamlCert: !!samlCert,
    hasSamlSigningKey: !!samlSigningKey,
    hasSamlSigningCert: !!samlSigningCert,
    hasOidcClientSecret: !!oidcClientSecret,
    hasScimToken: !!scimToken,
    isDomainVerified: isSsoDomainVerified(config),
    isDomainTrusted: isTrustedSsoDomain(config.emailDomainRestriction),
    domainVerifyDnsRecord: token ? ssoDomainVerifyDnsRecord(token) : null,
    domainVerifyHttpUrl: ssoDomainVerifyHttpUrl(config.emailDomainRestriction),
  }
}

export function stripSecrets(config: SsoConfigsSchemaTypeForSelect) {
  return toClientSsoConfig(config)
}

function tokenMatchesProof(body: string, token: string): boolean {
  const trimmed = body.trim()
  return trimmed === token || trimmed === ssoDomainVerifyDnsRecord(token)
}

export async function checkSsoDomainDnsTxt(args: CheckSsoDomainProofArgs): Promise<boolean> {
  try {
    const records = await resolveTxt(args.domain)
    return records.some((chunks) => tokenMatchesProof(chunks.join(''), args.token))
  } catch {
    return false
  }
}

export async function checkSsoDomainHttpFile(args: CheckSsoDomainProofArgs): Promise<boolean> {
  const urls = process.env.NODE_ENV === 'production'
    ? [`https://${args.domain}${SSO_DOMAIN_WELL_KNOWN_PATH}`]
    : [
      `https://${args.domain}${SSO_DOMAIN_WELL_KNOWN_PATH}`,
      `http://${args.domain}${SSO_DOMAIN_WELL_KNOWN_PATH}`,
    ]

  for (const url of urls) {
    const urlError = validateMetadataUrl(url)
    if (urlError) continue

    try {
      const response = await fetch(url, {
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
      })
      if (!response.ok) continue
      if (tokenMatchesProof(await response.text(), args.token)) return true
    } catch {
      continue
    }
  }

  return false
}

export async function proveSsoDomainOwnership(args: CheckSsoDomainProofArgs): Promise<SsoDomainVerificationMethod | null> {
  if (isTrustedSsoDomain(args.domain)) return 'trusted'
  if (await checkSsoDomainDnsTxt(args)) return 'dns'
  if (await checkSsoDomainHttpFile(args)) return 'http'
  return null
}

export function decryptSsoConfig(config: SsoConfigsSchemaTypeForSelect): SsoConfigsSchemaTypeForSelect {
  return {
    ...config,
    samlCert: decryptField(config.samlCert),
    samlSigningKey: decryptField(config.samlSigningKey),
    samlSigningCert: decryptField(config.samlSigningCert),
    oidcClientSecret: decryptField(config.oidcClientSecret),
  }
}

export function generateLoginCode(): string {
  return `${generateString(12)}:${Date.now()}`.toLowerCase()
}

const BLOCKED_HOSTNAMES = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]']
const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^fc00:/,
  /^fd/,
  /^fe80:/,
]

export function validateMetadataUrl(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return 'Invalid URL format'
  }

  if (parsed.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    return 'Only HTTPS URLs are allowed'
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return 'Only HTTP(S) URLs are allowed'
  }

  if (BLOCKED_HOSTNAMES.includes(parsed.hostname)) {
    return 'Localhost URLs are not allowed'
  }

  for (const range of PRIVATE_IP_RANGES) {
    if (range.test(parsed.hostname)) {
      return 'Private IP addresses are not allowed'
    }
  }

  return null
}
