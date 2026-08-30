import { randomBytes } from 'crypto'
import type { OAuthClientsSchemaTypeForSelect, OAuthGrantsSchemaTypeForSelect } from 'taskview-db-schemas'
import { OAuthRepository } from './OAuthRepository'
import {
    OAUTH_ACCESS_TOKEN_PREFIX,
    OAUTH_ACCESS_TOKEN_TTL_SECONDS,
    OAUTH_CODE_TTL_SECONDS,
    OAUTH_REFRESH_TOKEN_TTL_SECONDS,
    type AuthenticateClientArgs,
    type ConnectedApp,
    type CreateAuthCodeArgs,
    type ExchangeCodeArgs,
    type IssueTokenPairArgs,
    type OAuthResult,
    type OAuthTokenResponse,
    type RefreshTokensArgs,
    type RegisterClientArgs,
    type RevokeOwnGrantArgs,
    type ValidateRedirectUriArgs,
} from './types'
import {
    matchesRegisteredRedirectUri,
    randomToken,
    resourceMatches,
    safeCompareHex,
    sha256Hex,
    verifyPkce,
} from './oauth.utils'

export class OAuthManager {
    private static instance: OAuthManager | null = null

    public readonly repository: OAuthRepository

    constructor() {
        this.repository = new OAuthRepository()
    }

    static getInstance(): OAuthManager {
        if (!OAuthManager.instance) OAuthManager.instance = new OAuthManager()
        return OAuthManager.instance
    }

    async findClient(clientId: string): Promise<OAuthClientsSchemaTypeForSelect | null> {
        return this.repository.findClientByClientId(clientId)
    }

    async validateRedirectUri(args: ValidateRedirectUriArgs): Promise<OAuthResult<OAuthClientsSchemaTypeForSelect>> {
        const client = await this.repository.findClientByClientId(args.clientId)
        if (!client) {
            return { ok: false, error: 'invalid_client', description: 'Unknown client_id' }
        }
        if (!matchesRegisteredRedirectUri({ candidate: args.redirectUri, registered: client.redirectUris })) {
            return { ok: false, error: 'invalid_request', description: 'redirect_uri does not match a registered URI' }
        }
        return { ok: true, value: client }
    }

    async issueAuthCode(args: CreateAuthCodeArgs): Promise<string | null> {
        const code = randomToken()
        const created = await this.repository.createAuthCode({
            ...args,
            codeHash: sha256Hex(code),
            expiresAt: new Date(Date.now() + OAUTH_CODE_TTL_SECONDS * 1000),
        })
        if (!created) return null

        this.repository.deleteExpiredAuthCodes().catch(() => {})
        return code
    }

    async exchangeCode(args: ExchangeCodeArgs): Promise<OAuthResult<OAuthTokenResponse>> {
        const record = await this.repository.findAuthCodeByHash(sha256Hex(args.code))
        if (!record) {
            return { ok: false, error: 'invalid_grant', description: 'Authorization code is not valid' }
        }

        // A code presented twice means it leaked. Kill the grant it already produced.
        if (record.usedAt) {
            if (record.grantId) await this.repository.revokeGrant({ grantId: record.grantId })
            return { ok: false, error: 'invalid_grant', description: 'Authorization code has already been used' }
        }
        if (record.expiresAt < new Date()) {
            return { ok: false, error: 'invalid_grant', description: 'Authorization code has expired' }
        }
        if (record.clientId !== args.clientId) {
            return { ok: false, error: 'invalid_grant', description: 'Authorization code was issued to another client' }
        }
        if (record.redirectUri !== args.redirectUri) {
            return { ok: false, error: 'invalid_grant', description: 'redirect_uri does not match the authorization request' }
        }
        if (!verifyPkce({ codeVerifier: args.codeVerifier, codeChallenge: record.codeChallenge })) {
            return { ok: false, error: 'invalid_grant', description: 'code_verifier does not match code_challenge' }
        }
        if (!resourceMatches({ granted: record.resource, requested: args.resource })) {
            return { ok: false, error: 'invalid_target', description: 'resource does not match the authorization request' }
        }

        const client = await this.repository.findClientByClientId(record.clientId)

        const grant = await this.repository.createGrant({
            userId: record.userId,
            clientId: record.clientId,
            allowedPermissions: record.allowedPermissions,
            allowedGoalIds: record.allowedGoalIds,
            resource: record.resource,
        })
        if (!grant) {
            return { ok: false, error: 'server_error', description: 'Could not create the grant' }
        }

        const consumed = await this.repository.consumeAuthCode({ id: record.id, grantId: grant.id })
        if (!consumed) {
            await this.repository.revokeGrant({ grantId: grant.id })
            return { ok: false, error: 'invalid_grant', description: 'Authorization code has already been used' }
        }

        return this.issueTokenPair({ grant, clientName: client?.name ?? record.clientId })
    }

    async refreshTokens(args: RefreshTokensArgs): Promise<OAuthResult<OAuthTokenResponse>> {
        const presentedHash = sha256Hex(args.refreshToken)
        const grant = await this.repository.findGrantByRefreshHash(presentedHash)
        if (!grant) {
            return { ok: false, error: 'invalid_grant', description: 'Refresh token is not valid' }
        }
        if (grant.revokedAt) {
            return { ok: false, error: 'invalid_grant', description: 'This authorization has been revoked' }
        }

        // The previous token in the rotation chain showing up means it leaked.
        if (grant.refreshTokenPrevHash && safeCompareHex(grant.refreshTokenPrevHash, presentedHash)) {
            await this.repository.revokeGrant({ grantId: grant.id })
            return { ok: false, error: 'invalid_grant', description: 'Refresh token was reused; the authorization has been revoked' }
        }
        if (grant.refreshExpiresAt && grant.refreshExpiresAt < new Date()) {
            return { ok: false, error: 'invalid_grant', description: 'Refresh token has expired' }
        }
        if (grant.clientId !== args.clientId) {
            return { ok: false, error: 'invalid_grant', description: 'Refresh token was issued to another client' }
        }
        if (!resourceMatches({ granted: grant.resource, requested: args.resource })) {
            return { ok: false, error: 'invalid_target', description: 'resource does not match the granted audience' }
        }

        const client = await this.repository.findClientByClientId(grant.clientId)
        return this.issueTokenPair({ grant, clientName: client?.name ?? grant.clientId, prevRefreshHash: presentedHash })
    }

    async registerClient(args: RegisterClientArgs): Promise<OAuthResult<{ clientId: string; clientSecret: string | null }>> {
        const clientId = randomBytes(16).toString('hex')
        const clientSecret = args.isPublic ? null : randomToken()

        const client = await this.repository.createClient({
            clientId,
            clientSecretHash: clientSecret ? sha256Hex(clientSecret) : null,
            name: args.name.slice(0, 200),
            redirectUris: args.redirectUris,
            createdVia: 'dcr',
        })
        if (!client) {
            return { ok: false, error: 'server_error', description: 'Could not register the client' }
        }
        return { ok: true, value: { clientId, clientSecret } }
    }

    async authenticateClient(args: AuthenticateClientArgs): Promise<OAuthResult<OAuthClientsSchemaTypeForSelect>> {
        const client = await this.repository.findClientByClientId(args.clientId)
        if (!client) {
            return { ok: false, error: 'invalid_client', description: 'Unknown client_id' }
        }
        if (client.clientSecretHash) {
            if (!args.clientSecret || !safeCompareHex(client.clientSecretHash, sha256Hex(args.clientSecret))) {
                return { ok: false, error: 'invalid_client', description: 'Client authentication failed' }
            }
        }
        return { ok: true, value: client }
    }

    async fetchConnectedApps(userId: number): Promise<ConnectedApp[]> {
        const grants = await this.repository.fetchGrantsByUserId(userId)
        if (!grants.length) return []

        const clients = await this.repository.fetchClientsByClientIds(grants.map((grant) => grant.clientId))
        const nameByClientId = new Map(clients.map((client) => [client.clientId, client.name]))

        return grants.map((grant) => ({
            grantId: grant.id,
            clientId: grant.clientId,
            clientName: nameByClientId.get(grant.clientId) ?? grant.clientId,
            allowedPermissions: grant.allowedPermissions,
            allowedGoalIds: grant.allowedGoalIds,
            createdAt: grant.createdAt,
            lastUsedAt: grant.lastUsedAt,
        }))
    }

    async revokeGrant(args: RevokeOwnGrantArgs): Promise<boolean> {
        return this.repository.revokeGrant(args)
    }

    /** RFC 7009: accepts either an access token or a refresh token. */
    async revokeToken(token: string): Promise<void> {
        const hash = sha256Hex(token)

        const grantId = await this.repository.findGrantIdByAccessTokenHash(hash)
        if (grantId) {
            await this.repository.revokeGrant({ grantId })
            return
        }

        const grant = await this.repository.findGrantByRefreshHash(hash)
        if (grant) await this.repository.revokeGrant({ grantId: grant.id })
    }

    private async issueTokenPair(args: IssueTokenPairArgs): Promise<OAuthResult<OAuthTokenResponse>> {
        // Copied straight from the grant: these are the RBAC keys the user
        // ticked. An empty list means "do not narrow anything", the same thing
        // it means for a manually issued tvk_ token.
        const allowedPermissions = args.grant.allowedPermissions
        const accessToken = OAUTH_ACCESS_TOKEN_PREFIX + randomToken()
        const refreshToken = randomToken()
        const now = Date.now()

        const rotated = await this.repository.rotateRefreshToken({
            grantId: args.grant.id,
            refreshTokenHash: sha256Hex(refreshToken),
            prevHash: args.prevRefreshHash ?? null,
            refreshExpiresAt: new Date(now + OAUTH_REFRESH_TOKEN_TTL_SECONDS * 1000),
        })
        if (!rotated) {
            return { ok: false, error: 'invalid_grant', description: 'This authorization has been revoked' }
        }

        const created = await this.repository.createAccessToken({
            userId: args.grant.userId,
            name: args.clientName.slice(0, 100),
            tokenHash: sha256Hex(accessToken),
            allowedPermissions,
            allowedGoalIds: args.grant.allowedGoalIds,
            grantId: args.grant.id,
            expiresAt: new Date(now + OAUTH_ACCESS_TOKEN_TTL_SECONDS * 1000),
        })
        if (!created) {
            return { ok: false, error: 'server_error', description: 'Could not issue the access token' }
        }

        return {
            ok: true,
            value: {
                access_token: accessToken,
                token_type: 'Bearer',
                expires_in: OAUTH_ACCESS_TOKEN_TTL_SECONDS,
                refresh_token: refreshToken,
            },
        }
    }
}
