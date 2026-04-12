import type { SsoConfigsSchemaTypeForSelect } from 'taskview-db-schemas'
import type { SsoProvider } from './sso-provider.interface'
import { SamlProvider } from './saml.provider'
import { OidcProvider } from './oidc.provider'

export function createSsoProvider(config: SsoConfigsSchemaTypeForSelect): SsoProvider {
  switch (config.protocol) {
    case 'saml':
      return new SamlProvider(config)
    case 'oidc':
      return new OidcProvider(config)
    default:
      throw new Error(`Unsupported SSO protocol: ${config.protocol}`)
  }
}
