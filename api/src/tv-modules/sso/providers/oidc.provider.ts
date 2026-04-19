import { randomBytes } from 'crypto'
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
      const issuerUrl = new URL(this.config.oidcIssuer!)
      const isDev = process.env.NODE_ENV !== 'production'

      this.oidcConfig = await client.discovery(
        issuerUrl,
        this.config.oidcClientId!,
        this.config.oidcClientSecret!,
        undefined,
        isDev ? { execute: [client.allowInsecureRequests] } : undefined,
      )
    }
    return this.oidcConfig
  }

  async initiateLogin(_req: Request, res: Response, relayState?: string): Promise<void> {
    const config = await this.getOidcConfig()
    const scope = this.config.oidcScope ?? 'openid email profile'
    const codeVerifier = client.randomPKCECodeVerifier()
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier)
    const csrfToken = randomBytes(32).toString('hex')
    const nonce = randomBytes(32).toString('hex')

    const statePayload = JSON.stringify({
      csrf: csrfToken,
      relay: relayState ?? '',
    })

    res.cookie(`sso_cv_${this.config.id}`, codeVerifier, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000,
    })

    res.cookie(`sso_state_${this.config.id}`, csrfToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000,
    })

    res.cookie(`sso_nonce_${this.config.id}`, nonce, {
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
      state: statePayload,
      nonce,
    })

    const authUrl = client.buildAuthorizationUrl(config, params)
    res.redirect(authUrl.href)
  }

  async handleCallback(req: Request): Promise<SsoAuthResult> {
    const config = await this.getOidcConfig()
    const codeVerifier = req.cookies[`sso_cv_${this.config.id}`]
    const storedCsrf = req.cookies[`sso_state_${this.config.id}`]
    const storedNonce = req.cookies[`sso_nonce_${this.config.id}`]

    if (!codeVerifier) {
      throw new Error('Missing PKCE code verifier — session may have expired')
    }

    if (!storedCsrf) {
      throw new Error('Missing CSRF state — session may have expired')
    }

    if (!storedNonce) {
      throw new Error('Missing nonce — session may have expired')
    }

    const returnedState = req.query.state as string | undefined
    if (!returnedState) {
      throw new Error('Missing state parameter in callback')
    }

    let statePayload: { csrf: string, relay: string }
    try {
      statePayload = JSON.parse(returnedState)
    } catch {
      throw new Error('Invalid state parameter format')
    }

    if (statePayload.csrf !== storedCsrf) {
      throw new Error('CSRF state mismatch — possible CSRF attack')
    }

    const currentUrl = new URL(req.originalUrl, `${req.protocol}://${req.get('host')}`)
    const tokens = await client.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedState: returnedState,
    })

    const claims = tokens.claims()

    if (!claims || !claims.email) {
      throw new Error('OIDC token missing email claim')
    }

    if (claims.nonce !== storedNonce) {
      throw new Error('Nonce mismatch — possible token replay attack')
    }

    return {
      email: (claims.email as string).toLowerCase(),
      externalId: claims.sub,
      displayName: claims.name as string | undefined,
      provider: `oidc-${this.config.id}`,
    }
  }
}
