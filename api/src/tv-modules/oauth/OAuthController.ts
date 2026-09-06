import type { Request, Response } from 'express'
import { ArkErrors } from 'arktype'
import { PublicApiUrl } from '../../modules/public-url'
import { OAuthManager } from './OAuthManager'
import {
    type SendTokenErrorArgs,
    type SendTokenSuccessArgs,
    OAuthAuthorizeArkType,
    OAuthConsentArkType,
    OAuthRegisterArkType,
    OAuthRevokeArkType,
    OAuthTokenArkType,
} from './types'
import {
    buildRedirectUrl,
    isAcceptableRedirectUri,
    isDcrEnabled,
} from './oauth.utils'

export class OAuthController {
    private get manager() { return OAuthManager.getInstance() }

    authorize = async (req: Request, res: Response) => {
        const params = OAuthAuthorizeArkType(req.query)
        if (params instanceof ArkErrors) {
            return res.status(400).send(params.summary)
        }

        const client = await this.manager.validateRedirectUri({
            clientId: params.client_id,
            redirectUri: params.redirect_uri,
        })
        if (!client.ok) {
            return res.status(400).send(client.description)
        }

        const consentUrl = buildRedirectUrl({
            redirectUri: `${process.env.APP_URL}/oauth/consent`,
            params: {
                client_id: params.client_id,
                client_name: client.value.name,
                redirect_uri: params.redirect_uri,
                code_challenge: params.code_challenge,
                code_challenge_method: params.code_challenge_method,
                state: params.state,
                resource: params.resource,
            },
        })
        return res.redirect(consentUrl)
    }

    consent = async (req: Request, res: Response) => {
        const data = OAuthConsentArkType(req.body)
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary)
        }

        const userId = req.appUser.getUserData()?.id
        if (!userId) return res.status(401).end()

        const client = await this.manager.validateRedirectUri({
            clientId: data.client_id,
            redirectUri: data.redirect_uri,
        })
        if (!client.ok) {
            return res.status(400).send(client.description)
        }

        // Empty means "do not narrow", matching how a tvk_ token with no
        // permissions selected behaves. The user's own RBAC is still the ceiling.
        const code = await this.manager.issueAuthCode({
            clientId: data.client_id,
            userId,
            redirectUri: data.redirect_uri,
            codeChallenge: data.code_challenge,
            codeChallengeMethod: data.code_challenge_method,
            allowedPermissions: data.allowedPermissions ?? [],
            allowedGoalIds: data.allowedGoalIds ?? [],
            resource: data.resource ?? null,
        })
        if (!code) return res.status(500).end()

        return res.tvJson({
            redirectUrl: buildRedirectUrl({
                redirectUri: data.redirect_uri,
                params: { code, state: data.state },
            }),
        })
    }

    denyConsent = async (req: Request, res: Response) => {
        const data = OAuthConsentArkType(req.body)
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary)
        }

        const client = await this.manager.validateRedirectUri({
            clientId: data.client_id,
            redirectUri: data.redirect_uri,
        })
        if (!client.ok) {
            return res.status(400).send(client.description)
        }

        return res.tvJson({
            redirectUrl: buildRedirectUrl({
                redirectUri: data.redirect_uri,
                params: { error: 'access_denied', state: data.state },
            }),
        })
    }

    token = async (req: Request, res: Response) => {
        const data = OAuthTokenArkType(req.body)
        if (data instanceof ArkErrors) {
            return this.sendTokenError({ res, status: 400, error: 'invalid_request', description: data.summary })
        }

        const basic = this.readBasicAuth(req)
        const clientId = basic?.clientId ?? data.client_id
        const clientSecret = basic?.clientSecret ?? data.client_secret
        if (!clientId) {
            return this.sendTokenError({ res, status: 401, error: 'invalid_client', description: 'client_id is required' })
        }

        const client = await this.manager.authenticateClient({ clientId, clientSecret })
        if (!client.ok) {
            return this.sendTokenError({ res, status: 401, error: client.error, description: client.description })
        }

        const resource = data.resource ?? null

        if (data.grant_type === 'authorization_code') {
            if (!data.code || !data.code_verifier || !data.redirect_uri) {
                return this.sendTokenError({
                    res,
                    status: 400,
                    error: 'invalid_request',
                    description: 'code, code_verifier and redirect_uri are required',
                })
            }
            const result = await this.manager.exchangeCode({
                code: data.code,
                codeVerifier: data.code_verifier,
                clientId,
                redirectUri: data.redirect_uri,
                resource,
            })
            if (!result.ok) {
                return this.sendTokenError({ res, status: 400, error: result.error, description: result.description })
            }
            return this.sendTokenSuccess({ res, body: result.value })
        }

        if (!data.refresh_token) {
            return this.sendTokenError({ res, status: 400, error: 'invalid_request', description: 'refresh_token is required' })
        }
        const refreshed = await this.manager.refreshTokens({
            refreshToken: data.refresh_token,
            clientId,
            resource,
        })
        if (!refreshed.ok) {
            return this.sendTokenError({ res, status: 400, error: refreshed.error, description: refreshed.description })
        }
        return this.sendTokenSuccess({ res, body: refreshed.value })
    }

    register = async (req: Request, res: Response) => {
        if (!isDcrEnabled()) {
            return res.status(403).json({
                error: 'access_denied',
                error_description: 'Dynamic client registration is disabled on this instance',
            })
        }

        const data = OAuthRegisterArkType(req.body)
        if (data instanceof ArkErrors) {
            return res.status(400).json({ error: 'invalid_client_metadata', error_description: data.summary })
        }

        const rejected = data.redirect_uris.find((uri) => !isAcceptableRedirectUri(uri))
        if (rejected) {
            return res.status(400).json({
                error: 'invalid_redirect_uri',
                error_description: `redirect_uri must be https, loopback http, or an app scheme, and carry no fragment: ${rejected}`,
            })
        }

        const name = data.client_name?.trim() || 'Unnamed client'
        const isPublic = (data.token_endpoint_auth_method ?? 'none') === 'none'
        const result = await this.manager.registerClient({
            name,
            redirectUris: data.redirect_uris,
            isPublic,
        })
        if (!result.ok) {
            return res.status(500).json({ error: result.error, error_description: result.description })
        }

        return res.status(201).json({
            client_id: result.value.clientId,
            // RFC 7591 §3.2.1: client_secret_expires_at is REQUIRED whenever a
            // secret is issued. 0 means it does not expire.
            ...(result.value.clientSecret
                ? { client_secret: result.value.clientSecret, client_secret_expires_at: 0 }
                : {}),
            client_id_issued_at: Math.floor(Date.now() / 1000),
            client_name: name,
            redirect_uris: data.redirect_uris,
            token_endpoint_auth_method: isPublic ? 'none' : 'client_secret_post',
            grant_types: ['authorization_code', 'refresh_token'],
            response_types: ['code'],
        })
    }

    revoke = async (req: Request, res: Response) => {
        const data = OAuthRevokeArkType(req.body)
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary)
        }
        // RFC 7009: revocation always answers 200, even for an unknown token.
        await this.manager.revokeToken(data.token)
        return res.status(200).end()
    }

    fetchConnectedApps = async (req: Request, res: Response) => {
        const userId = req.appUser.getUserData()?.id
        if (!userId) return res.status(401).end()

        const result = await this.manager.fetchConnectedApps(userId)
        return res.tvJson(result)
    }

    revokeConnectedApp = async (req: Request, res: Response) => {
        const userId = req.appUser.getUserData()?.id
        if (!userId) return res.status(401).end()

        const grantId = Number(req.body?.grantId)
        if (!Number.isInteger(grantId) || grantId <= 0) {
            return res.status(400).send('grantId must be a positive integer')
        }

        const result = await this.manager.revokeGrant({ grantId, userId })
        return res.tvJson(result)
    }

    authorizationServerMetadata = async (req: Request, res: Response) => {
        const issuer = PublicApiUrl.base(req)
        return res.json({
            issuer,
            authorization_endpoint: `${issuer}/module/oauth/authorize`,
            token_endpoint: `${issuer}/module/oauth/token`,
            revocation_endpoint: `${issuer}/module/oauth/revoke`,
            ...(isDcrEnabled() ? { registration_endpoint: `${issuer}/module/oauth/register` } : {}),
            response_types_supported: ['code'],
            grant_types_supported: ['authorization_code', 'refresh_token'],
            code_challenge_methods_supported: ['S256'],
            token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
        })
    }

    protectedResourceMetadata = async (req: Request, res: Response) => {
        const issuer = PublicApiUrl.base(req)
        return res.json({
            resource: issuer,
            authorization_servers: [issuer],
            bearer_methods_supported: ['header'],
        })
    }

    private readBasicAuth(req: Request): { clientId: string; clientSecret: string } | null {
        const header = req.headers.authorization
        if (!header?.toLowerCase().startsWith('basic ')) return null

        const decoded = Buffer.from(header.slice(6).trim(), 'base64').toString('utf8')
        const separator = decoded.indexOf(':')
        if (separator < 0) return null

        return {
            clientId: decodeURIComponent(decoded.slice(0, separator)),
            clientSecret: decodeURIComponent(decoded.slice(separator + 1)),
        }
    }

    private sendTokenSuccess(args: SendTokenSuccessArgs) {
        args.res.setHeader('Cache-Control', 'no-store')
        args.res.setHeader('Pragma', 'no-cache')
        return args.res.json(args.body)
    }

    private sendTokenError(args: SendTokenErrorArgs) {
        args.res.setHeader('Cache-Control', 'no-store')
        return args.res.status(args.status).json({
            error: args.error,
            error_description: args.description,
        })
    }
}
