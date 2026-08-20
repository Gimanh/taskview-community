import { SAML, ValidateInResponseTo } from '@node-saml/node-saml'
import type { Request, Response } from 'express'
import type { SsoConfigsSchemaTypeForSelect } from 'taskview-db-schemas'
import { PublicApiUrl } from '../../../modules/public-url'
import { deriveSamlEmail } from '../sso.utils'
import type { SamlOptionsArgs } from '../types'
import type { SsoProvider, SsoAuthResult } from './sso-provider.interface'
import { SamlDbCacheProvider } from './saml-cache-provider'

function normalizeCert(cert: string): string {
  return cert
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/[\s\r\n]/g, '')
}

function buildSamlOptions({ config, mode, callbackUrl }: SamlOptionsArgs) {
  return {
    entryPoint: config.samlEntryPoint!,
    issuer: config.samlIssuer!,
    idpCert: normalizeCert(config.samlCert!),
    callbackUrl,
    wantAssertionsSigned: mode === 'assertion',
    wantAuthnResponseSigned: mode === 'response',
    validateInResponseTo: ValidateInResponseTo.always,
    requestIdExpirationPeriodMs: 5 * 60 * 1000,
    cacheProvider: new SamlDbCacheProvider(),
    ...(config.samlSigningKey && config.samlSigningCert ? {
      privateKey: config.samlSigningKey,
      signingCert: config.samlSigningCert,
      signatureAlgorithm: 'sha256' as const,
    } : {}),
  }
}

export class SamlProvider implements SsoProvider {
  private readonly config: SsoConfigsSchemaTypeForSelect

  constructor(config: SsoConfigsSchemaTypeForSelect) {
    this.config = config
  }

  private resolveCallbackUrl(req: Request): string {
    return this.config.samlCallbackUrl?.trim()
      || `${PublicApiUrl.base(req)}/module/sso/callback/${this.config.id}`
  }

  async initiateLogin(req: Request, res: Response, relayState?: string): Promise<void> {
    const saml = new SAML(buildSamlOptions({
      config: this.config,
      mode: 'assertion',
      callbackUrl: this.resolveCallbackUrl(req),
    }))
    const loginUrl = await saml.getAuthorizeUrlAsync(relayState ?? '', req.hostname, {})
    res.redirect(loginUrl)
  }

  async handleCallback(req: Request): Promise<SsoAuthResult> {
    const callbackUrl = this.resolveCallbackUrl(req)
    let profile

    try {
      const saml = new SAML(buildSamlOptions({ config: this.config, mode: 'assertion', callbackUrl }))
      const result = await saml.validatePostResponseAsync(req.body)
      profile = result.profile
    } catch {
      const saml = new SAML(buildSamlOptions({ config: this.config, mode: 'response', callbackUrl }))
      const result = await saml.validatePostResponseAsync(req.body)
      profile = result.profile
    }

    if (!profile || !profile.nameID) {
      throw new Error('SAML response missing nameID')
    }

    const email = deriveSamlEmail(profile as Record<string, unknown>)
    if (!email) {
      throw new Error('SAML response missing email attribute')
    }

    return {
      email,
      externalId: profile.nameID,
      displayName: (profile.displayName
        ?? profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']) as string | undefined,
      provider: `saml-${this.config.id}`,
    }
  }
}
