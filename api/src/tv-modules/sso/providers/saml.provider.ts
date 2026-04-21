import { SAML, ValidateInResponseTo } from '@node-saml/node-saml'
import type { Request, Response } from 'express'
import type { SsoConfigsSchemaTypeForSelect } from 'taskview-db-schemas'
import type { SsoProvider, SsoAuthResult } from './sso-provider.interface'
import { SamlDbCacheProvider } from './saml-cache-provider'

function normalizeCert(cert: string): string {
  return cert
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/[\s\r\n]/g, '')
}

function buildSamlOptions(config: SsoConfigsSchemaTypeForSelect, mode: 'assertion' | 'response') {
  return {
    entryPoint: config.samlEntryPoint!,
    issuer: config.samlIssuer!,
    idpCert: normalizeCert(config.samlCert!),
    callbackUrl: config.samlCallbackUrl!,
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
  private readonly samlAssertion: SAML
  private readonly samlResponse: SAML
  private readonly config: SsoConfigsSchemaTypeForSelect

  constructor(config: SsoConfigsSchemaTypeForSelect) {
    this.config = config
    this.samlAssertion = new SAML(buildSamlOptions(config, 'assertion'))
    this.samlResponse = new SAML(buildSamlOptions(config, 'response'))
  }

  async initiateLogin(req: Request, res: Response, relayState?: string): Promise<void> {
    const loginUrl = await this.samlAssertion.getAuthorizeUrlAsync(relayState ?? '', req.hostname, {})
    res.redirect(loginUrl)
  }

  async handleCallback(req: Request): Promise<SsoAuthResult> {
    let profile

    try {
      const result = await this.samlAssertion.validatePostResponseAsync(req.body)
      profile = result.profile
    } catch {
      const result = await this.samlResponse.validatePostResponseAsync(req.body)
      profile = result.profile
    }

    if (!profile || !profile.nameID) {
      throw new Error('SAML response missing nameID')
    }

    const email = (
      profile.email
      ?? profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']
      ?? profile.nameID
    ) as string

    return {
      email: email.toLowerCase(),
      externalId: profile.nameID,
      displayName: (profile.displayName
        ?? profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']) as string | undefined,
      provider: `saml-${this.config.id}`,
    }
  }
}
