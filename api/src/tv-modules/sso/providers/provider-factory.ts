import type { SsoConfigsSchemaTypeForSelect } from 'taskview-db-schemas'
import { decryptSsoConfig } from '../sso.utils'
import type { SsoProvider } from './sso-provider.interface'
import { SamlProvider } from './saml.provider'
import { OidcProvider } from './oidc.provider'

export function createSsoProvider(config: SsoConfigsSchemaTypeForSelect): SsoProvider {
  const decrypted = decryptSsoConfig(config)
  switch (decrypted.protocol) {
    case 'saml':
      return new SamlProvider(decrypted)
    case 'oidc':
      return new OidcProvider(decrypted)
    default:
      throw new Error(`Unsupported SSO protocol: ${decrypted.protocol}`)
  }
}
