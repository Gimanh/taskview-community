import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import nock from 'nock'
import { createHash } from 'crypto'
import type { IntegrationsSchemaTypeForSelect } from 'taskview-db-schemas'

const repositoryMock = {
    fetchById: vi.fn(),
    fetchMappingsByIntegrationId: vi.fn(),
    fetchMappingByTaskId: vi.fn(),
    backfillSourceUrls: vi.fn(),
    updateTaskComplete: vi.fn(),
    updateMappingState: vi.fn(),
    updateTaskTitleAndNote: vi.fn(),
    updateTaskSourceUrl: vi.fn(),
    createTasksAndMappingsBatch: vi.fn(),
    updateLastSyncedAt: vi.fn(),
    updateTokens: vi.fn(),
    updateWebhook: vi.fn(),
    existsRepoInProject: vi.fn(),
    updateRepo: vi.fn(),
}

vi.mock('../IntegrationsRepository', () => ({
    IntegrationsRepository: vi.fn(() => repositoryMock),
}))

const { IntegrationsManager } = await import('../IntegrationsManager')
const { encrypt, decrypt } = await import('../../../utils/crypto')
const { TasksRepository } = await import('../../tasks/TasksRepository')
type AppUserStub = ConstructorParameters<typeof IntegrationsManager>[0]

const GITHUB_API = 'https://api.github.com'
const GITLAB = 'https://gitlab.com'
const GITLAB_API = 'https://gitlab.com/api/v4'
const GITEA = 'https://gitea.com'
const GITEA_API = 'https://gitea.com/api/v1'

const NONCE = 'a'.repeat(64)
const nonceHash = (nonce: string) => createHash('sha256').update(nonce).digest('hex')

const fetchMinKanban = vi.fn()
const userStub = { tasksManager: { repository: { fetchTaskWithMinKanbanOrder: fetchMinKanban } } } as unknown as AppUserStub

const integration = (overrides: Partial<IntegrationsSchemaTypeForSelect> = {}): IntegrationsSchemaTypeForSelect => ({
    id: 11,
    provider: 'github',
    accessTokenEncrypted: encrypt('gh-token'),
    refreshTokenEncrypted: null,
    repoExternalId: null,
    repoFullName: 'o/r',
    projectId: 42,
    webhookId: null,
    webhookSecretEncrypted: null,
    isActive: true,
    lastSyncedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
})

let manager: InstanceType<typeof IntegrationsManager>

beforeAll(() => {
    nock.disableNetConnect()
    Object.assign(process.env, {
        JWT_SIGN: 'unit-test-secret',
        ENCRYPTION_KEY: 'ab'.repeat(32),
        API_URL: 'https://api.test',
        GITHUB_INTEGRATION_CLIENT_ID: 'gh-client',
        GITHUB_INTEGRATION_CALLBACK_URL: 'https://api.test/module/integrations/oauth/github/callback',
        GITLAB_INTEGRATION_CLIENT_ID: 'gl-client',
        GITLAB_INTEGRATION_CLIENT_SECRET: 'gl-secret',
        GITLAB_INTEGRATION_CALLBACK_URL: 'https://api.test/module/integrations/oauth/gitlab/callback',
        GITEA_INTEGRATION_CLIENT_ID: 'gt-client',
        GITEA_INTEGRATION_CLIENT_SECRET: 'gt-secret',
    })
    manager = new IntegrationsManager(userStub)
})

beforeEach(() => {
    vi.clearAllMocks()
    for (const fn of Object.values(repositoryMock)) fn.mockResolvedValue(true)
    repositoryMock.fetchMappingsByIntegrationId.mockResolvedValue([])
    repositoryMock.createTasksAndMappingsBatch.mockImplementation(async (items: unknown[]) => items.length)
    fetchMinKanban.mockResolvedValue(null)
})

afterEach(() => {
    expect(nock.pendingMocks()).toEqual([])
    nock.cleanAll()
})

describe('OAuth state', () => {
    const stateFor = (nonce: string, overrides: Record<string, unknown> = {}) =>
        jwt.sign({ userId: 7, projectId: 42, provider: 'github', nonceHash: nonceHash(nonce), ...overrides }, process.env.JWT_SIGN as string)

    it('puts only the hash of the nonce into the state', () => {
        const url = manager.getOAuthUrl({ provider: 'github', projectId: 42, userId: 7, nonce: NONCE })
        const state = new URL(url).searchParams.get('state') as string
        const payload = jwt.verify(state, process.env.JWT_SIGN as string) as Record<string, unknown>

        expect(payload.nonceHash).toBe(nonceHash(NONCE))
        expect(JSON.stringify(payload)).not.toContain(NONCE)
        expect(payload).toMatchObject({ userId: 7, projectId: 42, provider: 'github' })
    })

    it('accepts the nonce that produced the state', () => {
        const payload = manager.verifyOAuthState({ provider: 'github', state: stateFor(NONCE), nonce: NONCE })
        expect(payload).toMatchObject({ userId: 7, projectId: 42, provider: 'github' })
    })

    it('refuses a callback without the nonce cookie', () => {
        expect(() => manager.verifyOAuthState({ provider: 'github', state: stateFor(NONCE), nonce: undefined }))
            .toThrow('not started by this browser')
    })

    it('refuses a nonce from another browser', () => {
        expect(() => manager.verifyOAuthState({ provider: 'github', state: stateFor(NONCE), nonce: 'b'.repeat(64) }))
            .toThrow('not started by this browser')
    })

    it('refuses a state issued before nonces existed', () => {
        const legacy = jwt.sign({ userId: 7, projectId: 42, provider: 'github' }, process.env.JWT_SIGN as string)
        expect(() => manager.verifyOAuthState({ provider: 'github', state: legacy, nonce: NONCE }))
            .toThrow('not started by this browser')
    })

    it('refuses a state minted for another provider', () => {
        expect(() => manager.verifyOAuthState({ provider: 'gitlab', state: stateFor(NONCE), nonce: NONCE }))
            .toThrow('Provider mismatch')
    })

    it('refuses a state signed with another key', () => {
        const forged = jwt.sign({ userId: 7, projectId: 42, provider: 'github', nonceHash: nonceHash(NONCE) }, 'other-key')
        expect(() => manager.verifyOAuthState({ provider: 'github', state: forged, nonce: NONCE })).toThrow()
    })
})

describe('access tokens (via fetchRepos)', () => {
    it('GitHub tokens never expire, so no probe is made', async () => {
        repositoryMock.fetchById.mockResolvedValue(integration())
        nock(GITHUB_API).get('/user/repos').query(true).matchHeader('authorization', 'Bearer gh-token').reply(200, [])

        expect(await manager.fetchRepos(11)).toEqual([])
        expect(repositoryMock.updateTokens).not.toHaveBeenCalled()
    })

    it('GitLab keeps the current token when the probe succeeds', async () => {
        repositoryMock.fetchById.mockResolvedValue(integration({
            provider: 'gitlab', accessTokenEncrypted: encrypt('gl-a'), refreshTokenEncrypted: encrypt('gl-r'),
        }))
        nock(GITLAB_API)
            .get('/user').matchHeader('authorization', 'Bearer gl-a').reply(200, { id: 1 })
            .get('/projects').query(true).matchHeader('authorization', 'Bearer gl-a')
            .reply(200, [{ id: 3, path_with_namespace: 'g/p', name: 'p', visibility: 'private', description: 'd', web_url: 'u' }])

        expect(await manager.fetchRepos(11)).toEqual([{ id: 3, fullName: 'g/p', name: 'p', isPrivate: true, description: 'd', url: 'u' }])
        expect(repositoryMock.updateTokens).not.toHaveBeenCalled()
    })

    it('GitLab refreshes on 401, stores the new pair encrypted and retries with the new token', async () => {
        repositoryMock.fetchById.mockResolvedValue(integration({
            provider: 'gitlab', accessTokenEncrypted: encrypt('gl-old'), refreshTokenEncrypted: encrypt('gl-r'),
        }))
        nock(GITLAB_API).get('/user').matchHeader('authorization', 'Bearer gl-old').reply(401, {})
        nock(GITLAB).post('/oauth/token', (b) => b.grant_type === 'refresh_token' && b.refresh_token === 'gl-r')
            .reply(200, { access_token: 'gl-new', refresh_token: 'gl-new-r' })
        nock(GITLAB_API).get('/projects').query(true).matchHeader('authorization', 'Bearer gl-new').reply(200, [])

        await manager.fetchRepos(11)

        const [id, access, refresh] = repositoryMock.updateTokens.mock.calls[0]
        expect(id).toBe(11)
        expect(decrypt(access)).toBe('gl-new')
        expect(decrypt(refresh)).toBe('gl-new-r')
    })

    it('a probe failure other than 401 keeps the token instead of refreshing', async () => {
        repositoryMock.fetchById.mockResolvedValue(integration({
            provider: 'gitea', accessTokenEncrypted: encrypt('gt-a'), refreshTokenEncrypted: encrypt('gt-r'),
        }))
        nock(GITEA_API)
            .get('/user').reply(503, {})
            .get('/user/repos').query(true).matchHeader('authorization', 'Bearer gt-a').reply(200, [])

        expect(await manager.fetchRepos(11)).toEqual([])
        expect(repositoryMock.updateTokens).not.toHaveBeenCalled()
    })

    it('gives up when the refresh itself fails', async () => {
        repositoryMock.fetchById.mockResolvedValue(integration({
            provider: 'gitea', accessTokenEncrypted: encrypt('gt-a'), refreshTokenEncrypted: encrypt('gt-r'),
        }))
        nock(GITEA_API).get('/user').reply(401, {})
        nock(GITEA).post('/login/oauth/access_token').reply(400, { error: 'invalid_grant' })

        expect(await manager.fetchRepos(11)).toEqual([])
        expect(repositoryMock.updateTokens).not.toHaveBeenCalled()
    })

    it('an integration that never finished OAuth has no repos', async () => {
        repositoryMock.fetchById.mockResolvedValue(integration({ accessTokenEncrypted: null }))
        expect(await manager.fetchRepos(11)).toEqual([])
    })
})

describe('syncIssues', () => {
    const ghIssue = (n: number, state: 'open' | 'closed' = 'open') => ({ number: n, title: `t${n}`, body: `b${n}`, state, html_url: '' })

    it('inserts new issues oldest-first with descending kanban order below the current minimum', async () => {
        repositoryMock.fetchById.mockResolvedValue(integration())
        fetchMinKanban.mockResolvedValue(-100)
        nock(GITHUB_API).get('/repos/o/r/issues').query((q) => q.since === undefined)
            .reply(200, [ghIssue(3, 'closed'), ghIssue(2), ghIssue(1)])

        expect(await manager.syncIssues(11)).toBe(3)

        const items = repositoryMock.createTasksAndMappingsBatch.mock.calls[0][0]
        expect(items.map((i: { issueNumber: number }) => i.issueNumber)).toEqual([1, 2, 3])
        const gap = TasksRepository.KANBAN_ORDER_GAP
        expect(items.map((i: { kanbanOrder: number }) => i.kanbanOrder)).toEqual([-100 - gap, -100 - gap * 2, -100 - gap * 3])
        expect(items[2]).toMatchObject({
            goalId: 42, description: 't3', note: 'b3', complete: true, issueState: 'closed',
            sourceUrl: 'https://github.com/o/r/issues/3',
        })
        expect(repositoryMock.updateLastSyncedAt).toHaveBeenCalledWith(11)
        expect(repositoryMock.backfillSourceUrls).not.toHaveBeenCalled()
    })

    it('updates already-mapped issues in place and asks the provider only for changes since the last sync', async () => {
        const since = new Date('2026-01-01T00:00:00.000Z')
        repositoryMock.fetchById.mockResolvedValue(integration({ lastSyncedAt: since }))
        repositoryMock.fetchMappingsByIntegrationId.mockResolvedValue([
            { id: 900, integrationId: 11, taskId: 500, issueNumber: 1, issueState: 'open', syncedAt: null },
        ])
        nock(GITHUB_API).get('/repos/o/r/issues').query((q) => q.since === since.toISOString() && q.sort === 'updated')
            .reply(200, [{ ...ghIssue(1, 'closed'), title: 'renamed', body: null }])

        expect(await manager.syncIssues(11)).toBe(0)

        expect(repositoryMock.updateTaskComplete).toHaveBeenCalledWith(500, true)
        expect(repositoryMock.updateMappingState).toHaveBeenCalledWith(900, 'closed')
        expect(repositoryMock.updateTaskTitleAndNote).toHaveBeenCalledWith(500, 'renamed', null)
        expect(repositoryMock.updateTaskSourceUrl).toHaveBeenCalledWith(500, 'https://github.com/o/r/issues/1')
        expect(repositoryMock.backfillSourceUrls).toHaveBeenCalledWith(11, 'https://github.com/o/r/issues/')
        expect(repositoryMock.createTasksAndMappingsBatch).toHaveBeenCalledWith([])
    })

    it('does not touch the mapping state when it already matches', async () => {
        repositoryMock.fetchById.mockResolvedValue(integration())
        repositoryMock.fetchMappingsByIntegrationId.mockResolvedValue([
            { id: 900, integrationId: 11, taskId: 500, issueNumber: 1, issueState: 'open', syncedAt: null },
        ])
        nock(GITHUB_API).get('/repos/o/r/issues').query(true).reply(200, [ghIssue(1)])

        await manager.syncIssues(11)
        expect(repositoryMock.updateMappingState).not.toHaveBeenCalled()
    })

    it('GitLab maps issues by iid, uses the numeric project id and the /-/issues/ URL shape', async () => {
        repositoryMock.fetchById.mockResolvedValue(integration({
            provider: 'gitlab', repoExternalId: '77', repoFullName: 'g/p',
            accessTokenEncrypted: encrypt('gl-a'), refreshTokenEncrypted: encrypt('gl-r'),
        }))
        nock(GITLAB_API)
            .get('/user').reply(200, {})
            .get('/projects/77/issues').query(true)
            .reply(200, [{ iid: 9, title: 'gl', description: 'd', state: 'closed', web_url: '' }])

        await manager.syncIssues(11)
        expect(repositoryMock.createTasksAndMappingsBatch.mock.calls[0][0][0]).toMatchObject({
            issueNumber: 9, complete: true, issueState: 'closed', sourceUrl: 'https://gitlab.com/g/p/-/issues/9',
        })
    })

    it('GitLab without a stored project id syncs nothing rather than guessing', async () => {
        repositoryMock.fetchById.mockResolvedValue(integration({
            provider: 'gitlab', repoExternalId: null, accessTokenEncrypted: encrypt('gl-a'), refreshTokenEncrypted: null,
        }))
        expect(await manager.syncIssues(11)).toBe(0)
        expect(repositoryMock.createTasksAndMappingsBatch).toHaveBeenCalledWith([])
    })

    it('Gitea builds source URLs from its base URL', async () => {
        repositoryMock.fetchById.mockResolvedValue(integration({ provider: 'gitea', accessTokenEncrypted: encrypt('gt-a') }))
        nock(GITEA_API).get('/repos/o/r/issues').query(true)
            .reply(200, [{ number: 4, title: 'g', body: null, state: 'open', html_url: '' }])

        await manager.syncIssues(11)
        expect(repositoryMock.createTasksAndMappingsBatch.mock.calls[0][0][0]).toMatchObject({
            issueNumber: 4, complete: false, sourceUrl: 'https://gitea.com/o/r/issues/4',
        })
    })

    it('skips an integration without a selected repository', async () => {
        repositoryMock.fetchById.mockResolvedValue(integration({ repoFullName: null }))
        expect(await manager.syncIssues(11)).toBe(0)
        expect(repositoryMock.updateLastSyncedAt).not.toHaveBeenCalled()
    })
})

describe('onTaskCompleteChanged', () => {
    const mapping = (overrides: Partial<IntegrationsSchemaTypeForSelect> = {}, issueState = 'open') => ({
        id: 900, integrationId: 11, taskId: 500, issueNumber: 3, issueState, syncedAt: null, integration: integration(overrides),
    })

    it('is a no-op for a task that did not come from an integration', async () => {
        repositoryMock.fetchMappingByTaskId.mockResolvedValue(undefined)
        expect(await manager.onTaskCompleteChanged(500, true)).toBe(true)
    })

    it('leaves the provider alone when the integration is paused', async () => {
        repositoryMock.fetchMappingByTaskId.mockResolvedValue(mapping({ isActive: false }))
        expect(await manager.onTaskCompleteChanged(500, true)).toBe(true)
        expect(repositoryMock.updateMappingState).not.toHaveBeenCalled()
    })

    it('skips the round trip when the issue is already in the target state', async () => {
        repositoryMock.fetchMappingByTaskId.mockResolvedValue(mapping({}, 'closed'))
        expect(await manager.onTaskCompleteChanged(500, true)).toBe(true)
        expect(repositoryMock.updateMappingState).not.toHaveBeenCalled()
    })

    it('closes the GitHub issue and records the new state', async () => {
        repositoryMock.fetchMappingByTaskId.mockResolvedValue(mapping())
        nock(GITHUB_API).patch('/repos/o/r/issues/3', { state: 'closed' }).reply(200, {})

        expect(await manager.onTaskCompleteChanged(500, true)).toBe(true)
        expect(repositoryMock.updateMappingState).toHaveBeenCalledWith(900, 'closed')
    })

    it('reopens a GitLab issue with state_event=reopen', async () => {
        repositoryMock.fetchMappingByTaskId.mockResolvedValue(mapping({
            provider: 'gitlab', repoExternalId: '77', accessTokenEncrypted: encrypt('gl-a'), refreshTokenEncrypted: null,
        }, 'closed'))
        nock(GITLAB_API).put('/projects/77/issues/3', { state_event: 'reopen' }).reply(200, {})

        expect(await manager.onTaskCompleteChanged(500, false)).toBe(true)
        expect(repositoryMock.updateMappingState).toHaveBeenCalledWith(900, 'open')
    })

    it('closes a Gitea issue', async () => {
        repositoryMock.fetchMappingByTaskId.mockResolvedValue(mapping({ provider: 'gitea', accessTokenEncrypted: encrypt('gt-a') }))
        nock(GITEA_API).patch('/repos/o/r/issues/3', { state: 'closed' }).reply(200, {})

        expect(await manager.onTaskCompleteChanged(500, true)).toBe(true)
        expect(repositoryMock.updateMappingState).toHaveBeenCalledWith(900, 'closed')
    })

    it('reports failure when no usable token exists, so the caller can tell the user', async () => {
        repositoryMock.fetchMappingByTaskId.mockResolvedValue(mapping({
            provider: 'gitea', accessTokenEncrypted: encrypt('gt-a'), refreshTokenEncrypted: encrypt('gt-r'),
        }))
        nock(GITEA_API).get('/user').reply(401, {})
        nock(GITEA).post('/login/oauth/access_token').reply(400, {})

        expect(await manager.onTaskCompleteChanged(500, true)).toBe(false)
        expect(repositoryMock.updateMappingState).not.toHaveBeenCalled()
    })
})

describe('selectRepo and webhook registration', () => {
    const selection = { integrationId: 11, repoFullName: 'o/r', repoExternalId: '77' }

    it('refuses to connect a repository twice to the same project', async () => {
        repositoryMock.fetchById.mockResolvedValue(integration())
        repositoryMock.existsRepoInProject.mockResolvedValue(true)

        expect(await manager.selectRepo(selection)).toBe(false)
        expect(repositoryMock.updateRepo).not.toHaveBeenCalled()
        expect(repositoryMock.existsRepoInProject).toHaveBeenCalledWith(42, 'o/r', 11)
    })

    it('stores the repo, syncs it and registers a webhook whose secret is stored encrypted', async () => {
        repositoryMock.fetchById.mockResolvedValue(integration())
        repositoryMock.existsRepoInProject.mockResolvedValue(false)
        repositoryMock.updateRepo.mockResolvedValue(integration())
        nock(GITHUB_API).get('/repos/o/r/issues').query(true).reply(200, [])
        let receivedSecret = ''
        nock(GITHUB_API).post('/repos/o/r/hooks', (body) => {
            receivedSecret = body.config.secret
            return body.config.url === 'https://api.test/module/integrations/webhook/github'
        }).reply(201, { id: 55 })

        expect(await manager.selectRepo(selection)).toBeTruthy()
        await vi.waitFor(() => expect(repositoryMock.updateWebhook).toHaveBeenCalled())

        const [id, webhookId, secretEncrypted] = repositoryMock.updateWebhook.mock.calls[0]
        expect(id).toBe(11)
        expect(webhookId).toBe('55')
        expect(receivedSecret).toHaveLength(64)
        expect(decrypt(secretEncrypted)).toBe(receivedSecret)
        expect(secretEncrypted).not.toContain(receivedSecret)
        await vi.waitFor(() => expect(repositoryMock.updateLastSyncedAt).toHaveBeenCalledWith(11))
    })

    it('does not register a webhook when the API has no public URL to receive it', async () => {
        const saved = process.env.API_URL
        delete process.env.API_URL
        repositoryMock.fetchById.mockResolvedValue(integration())
        repositoryMock.existsRepoInProject.mockResolvedValue(false)
        repositoryMock.updateRepo.mockResolvedValue(integration())
        nock(GITHUB_API).get('/repos/o/r/issues').query(true).reply(200, [])

        await manager.selectRepo(selection)
        await vi.waitFor(() => expect(repositoryMock.updateLastSyncedAt).toHaveBeenCalled())
        expect(repositoryMock.updateWebhook).not.toHaveBeenCalled()
        process.env.API_URL = saved
    })

    it('GitLab needs the numeric project id to register a webhook', async () => {
        repositoryMock.fetchById.mockResolvedValue(integration({
            provider: 'gitlab', repoExternalId: null, accessTokenEncrypted: encrypt('gl-a'), refreshTokenEncrypted: null,
        }))
        repositoryMock.existsRepoInProject.mockResolvedValue(false)
        repositoryMock.updateRepo.mockResolvedValue(integration({ provider: 'gitlab' }))

        await manager.selectRepo(selection)
        await vi.waitFor(() => expect(repositoryMock.updateLastSyncedAt).toHaveBeenCalled())
        expect(repositoryMock.updateWebhook).not.toHaveBeenCalled()
    })
})
