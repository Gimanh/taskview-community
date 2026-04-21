import type { SsoConfigsSchemaTypeForSelect } from 'taskview-db-schemas'
import { decryptField } from '../../utils/crypto'
import { generateString } from '../../utils/helpers'

export const SSO_SECRET_FIELDS = ['samlCert', 'samlSigningKey', 'samlSigningCert', 'oidcClientSecret'] as const

export function stripSecrets(config: SsoConfigsSchemaTypeForSelect) {
  const { samlCert, samlSigningKey, samlSigningCert, oidcClientSecret, scimToken, ...safe } = config
  return {
    ...safe,
    hasSamlCert: !!samlCert,
    hasSamlSigningKey: !!samlSigningKey,
    hasSamlSigningCert: !!samlSigningCert,
    hasOidcClientSecret: !!oidcClientSecret,
    hasScimToken: !!scimToken,
  }
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
