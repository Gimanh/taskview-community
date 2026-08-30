import type { Response } from 'express'
import type { OAuthGrantsSchemaTypeForSelect } from 'taskview-db-schemas'
import { type } from 'arktype'

export const OAUTH_ACCESS_TOKEN_PREFIX = 'tvo_'
export const OAUTH_CODE_TTL_SECONDS = 60
export const OAUTH_ACCESS_TOKEN_TTL_SECONDS = 60 * 60
export const OAUTH_REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30

export const OAuthAuthorizeArkType = type({
    response_type: "'code'",
    client_id: 'string > 0',
    redirect_uri: 'string > 0',
    code_challenge: 'string > 0',
    code_challenge_method: "'S256'",
    'state?': 'string',
    'resource?': 'string',
})

export type OAuthAuthorizeArgs = typeof OAuthAuthorizeArkType.infer

export const OAuthConsentArkType = type({
    client_id: 'string > 0',
    redirect_uri: 'string > 0',
    code_challenge: 'string > 0',
    code_challenge_method: "'S256'",
    'allowedPermissions?': 'string[]',
    'allowedGoalIds?': 'number[]',
    'state?': 'string',
    'resource?': 'string',
})

export type OAuthConsentArgs = typeof OAuthConsentArkType.infer

export const OAuthTokenArkType = type({
    grant_type: "'authorization_code'|'refresh_token'",
    'client_id?': 'string',
    'client_secret?': 'string',
    'code?': 'string',
    'code_verifier?': 'string',
    'redirect_uri?': 'string',
    'refresh_token?': 'string',
    'resource?': 'string',
})

export type OAuthTokenArgs = typeof OAuthTokenArkType.infer

export const OAuthRegisterArkType = type({
    'client_name?': 'string',
    redirect_uris: 'string[] > 0',
    'token_endpoint_auth_method?': 'string',
    'grant_types?': 'string[]',
    'response_types?': 'string[]',
})

export type OAuthRegisterArgs = typeof OAuthRegisterArkType.infer

export const OAuthRevokeArkType = type({
    token: 'string > 0',
    'token_type_hint?': 'string',
})

export type OAuthRevokeArgs = typeof OAuthRevokeArkType.infer

export type CreateAuthCodeArgs = {
    clientId: string
    userId: number
    redirectUri: string
    codeChallenge: string
    codeChallengeMethod: string
    allowedPermissions: string[]
    allowedGoalIds: number[]
    resource: string | null
}

export type ExchangeCodeArgs = {
    code: string
    codeVerifier: string
    clientId: string
    redirectUri: string
    resource: string | null
}

export type RefreshTokensArgs = {
    refreshToken: string
    clientId: string
    resource: string | null
}

export type RegisterClientArgs = {
    name: string
    redirectUris: string[]
    isPublic: boolean
}

export type OAuthTokenResponse = {
    access_token: string
    token_type: 'Bearer'
    expires_in: number
    refresh_token: string
}

export type OAuthFailure = { ok: false; error: string; description: string }
export type OAuthSuccess<T> = { ok: true; value: T }
export type OAuthResult<T> = OAuthSuccess<T> | OAuthFailure

export type ConnectedApp = {
    grantId: number
    clientId: string
    clientName: string
    allowedPermissions: string[]
    allowedGoalIds: number[]
    createdAt: Date
    lastUsedAt: Date | null
}

export type CreateOAuthClientArgs = {
    clientId: string
    clientSecretHash: string | null
    name: string
    redirectUris: string[]
    createdVia: string
}

export type ConsumeAuthCodeArgs = {
    id: number
    grantId: number
}

export type RotateRefreshTokenArgs = {
    grantId: number
    refreshTokenHash: string
    prevHash: string | null
    refreshExpiresAt: Date
}

export type RevokeGrantArgs = {
    grantId: number
    /** Omitted for server-side revocation; set when the owner revokes from the UI. */
    userId?: number
}

export type RevokeOwnGrantArgs = {
    grantId: number
    userId: number
}

export type CreateAccessTokenArgs = {
    userId: number
    name: string
    tokenHash: string
    allowedPermissions: string[]
    allowedGoalIds: number[]
    grantId: number
    expiresAt: Date
}

export type ValidateRedirectUriArgs = {
    clientId: string
    redirectUri: string
}

export type AuthenticateClientArgs = {
    clientId: string
    clientSecret?: string
}

export type IssueTokenPairArgs = {
    grant: OAuthGrantsSchemaTypeForSelect
    clientName: string
    prevRefreshHash?: string
}

export type VerifyPkceArgs = {
    codeVerifier: string
    codeChallenge: string
}

export type MatchRedirectUriArgs = {
    candidate: string
    registered: string[]
}

export type BuildRedirectUrlArgs = {
    redirectUri: string
    params: Record<string, string | undefined>
}

export type ResourceMatchArgs = {
    granted: string | null
    requested: string | null
}

export type SendTokenSuccessArgs = {
    res: Response
    body: Record<string, unknown>
}

export type SendTokenErrorArgs = {
    res: Response
    status: number
    error: string
    description: string
}

