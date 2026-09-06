import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHash, randomBytes } from 'crypto'

const repositoryMock = {
    findClientByClientId: vi.fn(),
    findAuthCodeByHash: vi.fn(),
    consumeAuthCode: vi.fn(),
    createGrant: vi.fn(),
    createAccessToken: vi.fn(),
    rotateRefreshToken: vi.fn(),
    revokeGrant: vi.fn(),
    findGrantByRefreshHash: vi.fn(),
    findGrantIdByAccessTokenHash: vi.fn(),
    createAuthCode: vi.fn(),
    deleteExpiredAuthCodes: vi.fn(),
}

vi.mock('../OAuthRepository', () => ({
    OAuthRepository: vi.fn(() => repositoryMock),
}))

const { OAuthManager } = await import('../OAuthManager')

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')
const VERIFIER = randomBytes(40).toString('base64url')
const CHALLENGE = createHash('sha256').update(VERIFIER).digest('base64url')

const validCode = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    codeHash: sha256('the-code'),
    clientId: 'client-a',
    userId: 7,
    redirectUri: 'https://app.example.com/cb',
    codeChallenge: CHALLENGE,
    codeChallengeMethod: 'S256',
    allowedPermissions: ['goal_can_watch_content'],
    allowedGoalIds: [],
    resource: null,
    expiresAt: new Date(Date.now() + 60_000),
    usedAt: null,
    grantId: null,
    createdAt: new Date(),
    ...overrides,
})

const validGrant = (overrides: Record<string, unknown> = {}) => ({
    id: 42,
    userId: 7,
    clientId: 'client-a',
    allowedPermissions: ['goal_can_watch_content'],
    allowedGoalIds: [],
    resource: null,
    refreshTokenHash: sha256('current-refresh'),
    refreshTokenPrevHash: null,
    refreshExpiresAt: new Date(Date.now() + 86_400_000),
    lastUsedAt: null,
    revokedAt: null,
    createdAt: new Date(),
    ...overrides,
})

const exchangeArgs = (overrides: Record<string, unknown> = {}) => ({
    code: 'the-code',
    codeVerifier: VERIFIER,
    clientId: 'client-a',
    redirectUri: 'https://app.example.com/cb',
    resource: null,
    ...overrides,
})

describe('OAuthManager.exchangeCode', () => {
    let manager: InstanceType<typeof OAuthManager>

    beforeEach(() => {
        vi.clearAllMocks()
        manager = new OAuthManager()
        repositoryMock.findClientByClientId.mockResolvedValue({ clientId: 'client-a', name: 'Client A' })
        repositoryMock.createGrant.mockResolvedValue(validGrant())
        repositoryMock.consumeAuthCode.mockResolvedValue(true)
        repositoryMock.rotateRefreshToken.mockResolvedValue(true)
        repositoryMock.createAccessToken.mockResolvedValue(true)
        repositoryMock.revokeGrant.mockResolvedValue(true)
    })

    it('issues a tvo_ access token and a refresh token on a valid exchange', async () => {
        repositoryMock.findAuthCodeByHash.mockResolvedValue(validCode())

        const result = await manager.exchangeCode(exchangeArgs())

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.value.access_token.startsWith('tvo_')).toBe(true)
        expect(result.value.refresh_token).toBeTruthy()
        expect(result.value.token_type).toBe('Bearer')
    })

    it('stores only the hash of the access token, never the token itself', async () => {
        repositoryMock.findAuthCodeByHash.mockResolvedValue(validCode())

        const result = await manager.exchangeCode(exchangeArgs())

        expect(result.ok).toBe(true)
        if (!result.ok) return
        const stored = repositoryMock.createAccessToken.mock.calls[0][0]
        expect(stored.tokenHash).toBe(sha256(result.value.access_token))
        expect(JSON.stringify(stored)).not.toContain(result.value.access_token)
    })

    it('rejects a wrong code_verifier', async () => {
        repositoryMock.findAuthCodeByHash.mockResolvedValue(validCode())

        const result = await manager.exchangeCode(exchangeArgs({ codeVerifier: randomBytes(40).toString('base64url') }))

        expect(result).toMatchObject({ ok: false, error: 'invalid_grant' })
        expect(repositoryMock.createGrant).not.toHaveBeenCalled()
    })

    it('rejects a redirect_uri that differs from the authorization request', async () => {
        repositoryMock.findAuthCodeByHash.mockResolvedValue(validCode())

        const result = await manager.exchangeCode(exchangeArgs({ redirectUri: 'https://app.example.com/other' }))

        expect(result).toMatchObject({ ok: false, error: 'invalid_grant' })
    })

    it('rejects a code presented by a different client', async () => {
        repositoryMock.findAuthCodeByHash.mockResolvedValue(validCode())

        const result = await manager.exchangeCode(exchangeArgs({ clientId: 'client-b' }))

        expect(result).toMatchObject({ ok: false, error: 'invalid_grant' })
    })

    it('rejects an expired code', async () => {
        repositoryMock.findAuthCodeByHash.mockResolvedValue(validCode({ expiresAt: new Date(Date.now() - 1000) }))

        const result = await manager.exchangeCode(exchangeArgs())

        expect(result).toMatchObject({ ok: false, error: 'invalid_grant' })
    })

    it('revokes the original grant when a used code is replayed', async () => {
        repositoryMock.findAuthCodeByHash.mockResolvedValue(validCode({ usedAt: new Date(), grantId: 42 }))

        const result = await manager.exchangeCode(exchangeArgs())

        expect(result).toMatchObject({ ok: false, error: 'invalid_grant' })
        expect(repositoryMock.revokeGrant).toHaveBeenCalledWith({ grantId: 42 })
    })

    it('rolls back the grant when the code was consumed by a concurrent request', async () => {
        repositoryMock.findAuthCodeByHash.mockResolvedValue(validCode())
        repositoryMock.consumeAuthCode.mockResolvedValue(false)

        const result = await manager.exchangeCode(exchangeArgs())

        expect(result).toMatchObject({ ok: false, error: 'invalid_grant' })
        expect(repositoryMock.revokeGrant).toHaveBeenCalledWith({ grantId: 42 })
    })

    it('rejects a resource that does not match the authorization request', async () => {
        repositoryMock.findAuthCodeByHash.mockResolvedValue(validCode({ resource: 'https://mcp.example.com' }))

        const result = await manager.exchangeCode(exchangeArgs({ resource: 'https://other.example.com' }))

        expect(result).toMatchObject({ ok: false, error: 'invalid_target' })
    })

    it('rejects an unknown code', async () => {
        repositoryMock.findAuthCodeByHash.mockResolvedValue(null)

        const result = await manager.exchangeCode(exchangeArgs())

        expect(result).toMatchObject({ ok: false, error: 'invalid_grant' })
    })
})

describe('OAuthManager.refreshTokens', () => {
    let manager: InstanceType<typeof OAuthManager>

    beforeEach(() => {
        vi.clearAllMocks()
        manager = new OAuthManager()
        repositoryMock.findClientByClientId.mockResolvedValue({ clientId: 'client-a', name: 'Client A' })
        repositoryMock.rotateRefreshToken.mockResolvedValue(true)
        repositoryMock.createAccessToken.mockResolvedValue(true)
        repositoryMock.revokeGrant.mockResolvedValue(true)
    })

    it('rotates the refresh token and keeps the presented one as the previous hash', async () => {
        repositoryMock.findGrantByRefreshHash.mockResolvedValue(validGrant())

        const result = await manager.refreshTokens({
            refreshToken: 'current-refresh',
            clientId: 'client-a',
            resource: null,
        })

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.value.refresh_token).not.toBe('current-refresh')

        const rotation = repositoryMock.rotateRefreshToken.mock.calls[0][0]
        expect(rotation.prevHash).toBe(sha256('current-refresh'))
        expect(rotation.refreshTokenHash).toBe(sha256(result.value.refresh_token))
    })

    it('revokes the whole grant when a superseded refresh token is replayed', async () => {
        repositoryMock.findGrantByRefreshHash.mockResolvedValue(validGrant({
            refreshTokenHash: sha256('rotated-refresh'),
            refreshTokenPrevHash: sha256('leaked-refresh'),
        }))

        const result = await manager.refreshTokens({
            refreshToken: 'leaked-refresh',
            clientId: 'client-a',
            resource: null,
        })

        expect(result).toMatchObject({ ok: false, error: 'invalid_grant' })
        expect(repositoryMock.revokeGrant).toHaveBeenCalledWith({ grantId: 42 })
    })

    it('refuses a revoked grant', async () => {
        repositoryMock.findGrantByRefreshHash.mockResolvedValue(validGrant({ revokedAt: new Date() }))

        const result = await manager.refreshTokens({
            refreshToken: 'current-refresh',
            clientId: 'client-a',
            resource: null,
        })

        expect(result).toMatchObject({ ok: false, error: 'invalid_grant' })
    })

    it('refuses an expired refresh token', async () => {
        repositoryMock.findGrantByRefreshHash.mockResolvedValue(validGrant({
            refreshExpiresAt: new Date(Date.now() - 1000),
        }))

        const result = await manager.refreshTokens({
            refreshToken: 'current-refresh',
            clientId: 'client-a',
            resource: null,
        })

        expect(result).toMatchObject({ ok: false, error: 'invalid_grant' })
    })

    it('refuses a refresh token presented by another client', async () => {
        repositoryMock.findGrantByRefreshHash.mockResolvedValue(validGrant())

        const result = await manager.refreshTokens({
            refreshToken: 'current-refresh',
            clientId: 'client-b',
            resource: null,
        })

        expect(result).toMatchObject({ ok: false, error: 'invalid_grant' })
    })

    it('carries the consented permission keys onto the reissued token', async () => {
        repositoryMock.findGrantByRefreshHash.mockResolvedValue(validGrant({
            allowedPermissions: ['timetracking_can_view', 'task_can_edit_status'],
        }))

        await manager.refreshTokens({ refreshToken: 'current-refresh', clientId: 'client-a', resource: null })

        const stored = repositoryMock.createAccessToken.mock.calls[0][0]
        expect(stored.allowedPermissions).toEqual(['timetracking_can_view', 'task_can_edit_status'])
    })

    it('keeps an unrestricted grant unrestricted, which is what "all permissions" means', async () => {
        repositoryMock.findGrantByRefreshHash.mockResolvedValue(validGrant({ allowedPermissions: [] }))

        await manager.refreshTokens({ refreshToken: 'current-refresh', clientId: 'client-a', resource: null })

        const stored = repositoryMock.createAccessToken.mock.calls[0][0]
        expect(stored.allowedPermissions).toEqual([])
    })
})

describe('OAuthManager.authenticateClient', () => {
    let manager: InstanceType<typeof OAuthManager>

    beforeEach(() => {
        vi.clearAllMocks()
        manager = new OAuthManager()
    })

    it('accepts a public client with no secret', async () => {
        repositoryMock.findClientByClientId.mockResolvedValue({ clientId: 'pub', clientSecretHash: null })

        const result = await manager.authenticateClient({ clientId: 'pub' })

        expect(result.ok).toBe(true)
    })

    it('rejects a confidential client presenting the wrong secret', async () => {
        repositoryMock.findClientByClientId.mockResolvedValue({
            clientId: 'conf',
            clientSecretHash: sha256('right'),
        })

        const result = await manager.authenticateClient({ clientId: 'conf', clientSecret: 'wrong' })

        expect(result).toMatchObject({ ok: false, error: 'invalid_client' })
    })

    it('rejects a confidential client presenting no secret at all', async () => {
        repositoryMock.findClientByClientId.mockResolvedValue({
            clientId: 'conf',
            clientSecretHash: sha256('right'),
        })

        const result = await manager.authenticateClient({ clientId: 'conf' })

        expect(result).toMatchObject({ ok: false, error: 'invalid_client' })
    })

    it('rejects an unknown client', async () => {
        repositoryMock.findClientByClientId.mockResolvedValue(null)

        const result = await manager.authenticateClient({ clientId: 'nope' })

        expect(result).toMatchObject({ ok: false, error: 'invalid_client' })
    })
})
