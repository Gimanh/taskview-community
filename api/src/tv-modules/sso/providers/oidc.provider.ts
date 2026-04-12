import * as client from 'openid-client'
import type { Request, Response } from 'express'
import type { SsoConfigsSchemaTypeForSelect } from 'taskview-db-schemas'
import type { SsoProvider, SsoAuthResult } from './sso-provider.interface'

export class OidcProvider implements SsoProvider {
  private readonly config: SsoConfigsSchemaTypeForSelect
  private oidcConfig: client.Configuration | null = null

  constructor(config: SsoConfigsSchemaTypeForSelect) {
    this.config = config
  }

  private async getOidcConfig(): Promise<client.Configuration> {
    if (!this.oidcConfig) {
      this.oidcConfig = await client.discovery(
        new URL(this.config.oidcIssuer!),
        this.config.oidcClientId!,
        this.config.oidcClientSecret!,
      )
    }
    return this.oidcConfig
  }

  async initiateLogin(_req: Request, res: Response, relayState?: string): Promise<void> {
    const config = await this.getOidcConfig()
    const scope = this.config.oidcScope ?? 'openid email profile'
    const codeVerifier = client.randomPKCECodeVerifier()
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier)

    res.cookie(`sso_cv_${this.config.id}`, codeVerifier, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000,
    })

    const params = new URLSearchParams({
      redirect_uri: this.config.oidcCallbackUrl!,
      scope,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      response_type: 'code',
    })

    if (relayState) {
      params.set('state', relayState)
    }

    const authUrl = client.buildAuthorizationUrl(config, params)
    res.redirect(authUrl.href)
  }

  async handleCallback(req: Request): Promise<SsoAuthResult> {
    const config = await this.getOidcConfig()
    const codeVerifier = req.cookies[`sso_cv_${this.config.id}`]

    if (!codeVerifier) {
      throw new Error('Missing PKCE code verifier — session may have expired')
    }

    const currentUrl = new URL(req.originalUrl, `${req.protocol}://${req.get('host')}`)
    const tokens = await client.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedState: req.query.state as string | undefined,
    })

    const claims = tokens.claims()

    if (!claims || !claims.email) {
      throw new Error('OIDC token missing email claim')
    }

    return {
      email: (claims.email as string).toLowerCase(),
      externalId: claims.sub,
      displayName: claims.name as string | undefined,
      provider: `oidc-${this.config.id}`,
    }
  }
}
