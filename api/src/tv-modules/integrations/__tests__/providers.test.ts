import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import nock from 'nock'
import { createHmac } from 'crypto'
import {
    createGitHubWebhook,
    exchangeGitHubCode,
    fetchGitHubIssues,
    fetchGitHubRepos,
    getGitHubOAuthUrl,
    updateGitHubIssueState,
    verifyGitHubWebhookSignature,
} from '../providers/github.provider'
import {
    createGitLabWebhook,
    exchangeGitLabCode,
    fetchGitLabIssues,
    fetchGitLabRepos,
    getGitLabOAuthUrl,
    refreshGitLabToken,
    updateGitLabIssueState,
    verifyGitLabWebhookToken,
} from '../providers/gitlab.provider'
import {
    createGiteaWebhook,
    exchangeGiteaCode,
    fetchGiteaIssues,
    fetchGiteaRepos,
    getGiteaOAuthUrl,
    refreshGiteaToken,
    updateGiteaIssueState,
    verifyGiteaToken,
    verifyGiteaWebhookSignature,
} from '../providers/gitea.provider'

const GITHUB = 'https://github.com'
const GITHUB_API = 'https://api.github.com'
const GITLAB = 'https://gitlab.com'
const GITLAB_API = 'https://gitlab.com/api/v4'
const GITEA = 'https://gitea.com'
const GITEA_API = 'https://gitea.com/api/v1'

const fill = <T>(count: number, make: (i: number) => T): T[] => Array.from({ length: count }, (_, i) => make(i))

beforeAll(() => {
    nock.disableNetConnect()
    Object.assign(process.env, {
        GITHUB_INTEGRATION_CLIENT_ID: 'gh-id',
        GITHUB_INTEGRATION_CLIENT_SECRET: 'gh-secret',
        GITHUB_INTEGRATION_CALLBACK_URL: 'https://api.test/module/integrations/oauth/github/callback',
        GITLAB_INTEGRATION_CLIENT_ID: 'gl-id',
        GITLAB_INTEGRATION_CLIENT_SECRET: 'gl-secret',
        GITLAB_INTEGRATION_CALLBACK_URL: 'https://api.test/module/integrations/oauth/gitlab/callback',
        GITEA_INTEGRATION_CLIENT_ID: 'gt-id',
        GITEA_INTEGRATION_CLIENT_SECRET: 'gt-secret',
        GITEA_INTEGRATION_CALLBACK_URL: 'https://api.test/module/integrations/oauth/gitea/callback',
    })
})

afterEach(() => {
    expect(nock.pendingMocks()).toEqual([])
    nock.cleanAll()
})

describe('OAuth authorization URLs', () => {
    it('GitHub asks for the repo scope and carries the state', () => {
        const url = new URL(getGitHubOAuthUrl('the-state'))
        expect(url.origin + url.pathname).toBe(`${GITHUB}/login/oauth/authorize`)
        expect(url.searchParams.get('client_id')).toBe('gh-id')
        expect(url.searchParams.get('redirect_uri')).toBe(process.env.GITHUB_INTEGRATION_CALLBACK_URL)
        expect(url.searchParams.get('scope')).toBe('repo')
        expect(url.searchParams.get('state')).toBe('the-state')
    })

    it('GitLab asks for the api scope with response_type=code', () => {
        const url = new URL(getGitLabOAuthUrl('s'))
        expect(url.origin + url.pathname).toBe(`${GITLAB}/oauth/authorize`)
        expect(url.searchParams.get('response_type')).toBe('code')
        expect(url.searchParams.get('scope')).toBe('api')
        expect(url.searchParams.get('state')).toBe('s')
    })

    it('Gitea uses its login/oauth path', () => {
        const url = new URL(getGiteaOAuthUrl('s'))
        expect(url.origin + url.pathname).toBe(`${GITEA}/login/oauth/authorize`)
        expect(url.searchParams.get('response_type')).toBe('code')
        expect(url.searchParams.get('client_id')).toBe('gt-id')
    })

    it.each([
        ['GitHub', 'GITHUB_INTEGRATION_CLIENT_ID', () => getGitHubOAuthUrl('s')],
        ['GitLab', 'GITLAB_INTEGRATION_CALLBACK_URL', () => getGitLabOAuthUrl('s')],
        ['Gitea', 'GITEA_INTEGRATION_CLIENT_ID', () => getGiteaOAuthUrl('s')],
    ])('%s refuses to build a URL when the integration is not configured', (_name, envKey, build) => {
        const saved = process.env[envKey]
        delete process.env[envKey]
        expect(build).toThrow('not configured')
        process.env[envKey] = saved
    })
})

describe('code exchange and refresh', () => {
    it('GitHub posts client credentials and returns the access token', async () => {
        nock(GITHUB)
            .post('/login/oauth/access_token', { client_id: 'gh-id', client_secret: 'gh-secret', code: 'c0de' })
            .matchHeader('accept', 'application/json')
            .reply(200, { access_token: 'gh-token', token_type: 'bearer' })

        expect(await exchangeGitHubCode('c0de')).toBe('gh-token')
    })

    it('GitHub rejects a reply without an access token', async () => {
        nock(GITHUB).post('/login/oauth/access_token').reply(200, { error: 'bad_verification_code' })
        await expect(exchangeGitHubCode('c0de')).rejects.toThrow('Failed to exchange GitHub code')
    })

    it('GitLab exchanges with grant_type and redirect_uri and keeps the refresh token', async () => {
        nock(GITLAB)
            .post('/oauth/token', (body) =>
                body.grant_type === 'authorization_code'
                && body.code === 'c0de'
                && body.redirect_uri === process.env.GITLAB_INTEGRATION_CALLBACK_URL)
            .reply(200, { access_token: 'gl-a', refresh_token: 'gl-r', token_type: 'bearer' })

        expect(await exchangeGitLabCode('c0de')).toEqual({ accessToken: 'gl-a', refreshToken: 'gl-r' })
    })

    it('GitLab refreshes with grant_type=refresh_token', async () => {
        nock(GITLAB)
            .post('/oauth/token', (body) => body.grant_type === 'refresh_token' && body.refresh_token === 'old-r')
            .reply(200, { access_token: 'new-a', refresh_token: 'new-r', token_type: 'bearer' })

        expect(await refreshGitLabToken('old-r')).toEqual({ accessToken: 'new-a', refreshToken: 'new-r' })
    })

    it('GitLab surfaces a failed refresh', async () => {
        nock(GITLAB).post('/oauth/token').reply(200, {})
        await expect(refreshGitLabToken('old-r')).rejects.toThrow('Failed to refresh GitLab token')
    })

    it('Gitea tolerates a reply without a refresh token', async () => {
        nock(GITEA)
            .post('/login/oauth/access_token', (body) => body.grant_type === 'authorization_code' && body.code === 'c0de')
            .reply(200, { access_token: 'gt-a', token_type: 'bearer' })

        expect(await exchangeGiteaCode('c0de')).toEqual({ accessToken: 'gt-a', refreshToken: null })
    })

    it('Gitea refreshes and probes the token via /user', async () => {
        nock(GITEA)
            .post('/login/oauth/access_token', (body) => body.grant_type === 'refresh_token')
            .reply(200, { access_token: 'gt-new', refresh_token: 'gt-new-r', token_type: 'bearer' })
        nock(GITEA_API).get('/user').matchHeader('authorization', 'Bearer gt-new').reply(200, { id: 1 })

        expect(await refreshGiteaToken('gt-r')).toEqual({ accessToken: 'gt-new', refreshToken: 'gt-new-r' })
        await expect(verifyGiteaToken('gt-new')).resolves.toBeUndefined()
    })
})

describe('repository listing', () => {
    it('GitHub walks every page until a short one and sends the bearer token', async () => {
        const page1 = fill(100, (i) => ({ id: i, full_name: `o/r${i}`, name: `r${i}`, private: false, description: null, html_url: '' }))
        nock(GITHUB_API)
            .get('/user/repos').query((q) => q.page === '1' && q.per_page === '100')
            .matchHeader('authorization', 'Bearer t')
            .reply(200, page1)
            .get('/user/repos').query((q) => q.page === '2')
            .reply(200, page1.slice(0, 3))

        expect(await fetchGitHubRepos('t')).toHaveLength(103)
    })

    it('GitLab lists only projects the user is a member of', async () => {
        nock(GITLAB_API)
            .get('/projects').query((q) => q.membership === 'true' && q.page === '1')
            .reply(200, [{ id: 1, path_with_namespace: 'g/p', name: 'p', visibility: 'private', description: null, web_url: '' }])

        expect(await fetchGitLabRepos('t')).toHaveLength(1)
    })

    it('Gitea pages by 50', async () => {
        const page = fill(50, (i) => ({ id: i, full_name: `o/r${i}`, name: `r${i}`, private: false, description: null, html_url: '' }))
        nock(GITEA_API)
            .get('/user/repos').query((q) => q.limit === '50' && q.page === '1').reply(200, page)
            .get('/user/repos').query((q) => q.page === '2').reply(200, [])

        expect(await fetchGiteaRepos('t')).toHaveLength(50)
    })
})

describe('issue listing', () => {
    it('GitHub drops pull requests and asks for all states', async () => {
        nock(GITHUB_API)
            .get('/repos/o/r/issues').query((q) => q.state === 'all' && q.sort === 'created' && q.since === undefined)
            .reply(200, [
                { number: 1, title: 'issue', body: null, state: 'open', html_url: '' },
                { number: 2, title: 'pr', body: null, state: 'open', html_url: '', pull_request: {} },
            ])

        const issues = await fetchGitHubIssues('t', 'o/r')
        expect(issues.map((i) => i.number)).toEqual([1])
    })

    it('GitHub switches to updated ordering when a since is given', async () => {
        nock(GITHUB_API)
            .get('/repos/o/r/issues').query((q) => q.sort === 'updated' && q.since === '2026-01-01T00:00:00.000Z')
            .reply(200, [])

        expect(await fetchGitHubIssues('t', 'o/r', '2026-01-01T00:00:00.000Z')).toEqual([])
    })

    it('GitLab filters by updated_after for incremental syncs', async () => {
        nock(GITLAB_API)
            .get('/projects/77/issues').query((q) => q.order_by === 'updated_at' && q.updated_after === '2026-01-01')
            .reply(200, [{ iid: 5, title: 't', description: null, state: 'opened', web_url: '' }])

        expect(await fetchGitLabIssues('t', 77, '2026-01-01')).toHaveLength(1)
    })

    it('Gitea excludes pull requests server-side with type=issues', async () => {
        nock(GITEA_API)
            .get('/repos/o/r/issues').query((q) => q.type === 'issues' && q.state === 'all' && q.limit === '50')
            .reply(200, [{ number: 1, title: 't', body: null, state: 'closed', html_url: '' }])

        expect(await fetchGiteaIssues({ accessToken: 't', repoFullName: 'o/r' })).toHaveLength(1)
    })
})

describe('webhook registration and issue state', () => {
    it('GitHub registers an issues webhook carrying the secret', async () => {
        nock(GITHUB_API)
            .post('/repos/o/r/hooks', (body) =>
                body.events.includes('issues') && body.config.secret === 's3cret' && body.config.url === 'https://api.test/wh')
            .reply(201, { id: 42 })

        expect(await createGitHubWebhook('t', 'o/r', 'https://api.test/wh', 's3cret')).toEqual({ id: 42 })
    })

    it('GitLab registers with issues_events and the token', async () => {
        nock(GITLAB_API)
            .post('/projects/77/hooks', (body) => body.issues_events === true && body.token === 's3cret')
            .reply(201, { id: 7 })

        expect(await createGitLabWebhook('t', 77, 'https://api.test/wh', 's3cret')).toEqual({ id: 7 })
    })

    it('Gitea registers a gitea-type hook', async () => {
        nock(GITEA_API)
            .post('/repos/o/r/hooks', (body) => body.type === 'gitea' && body.config.secret === 's3cret')
            .reply(201, { id: 9 })

        expect(await createGiteaWebhook({ accessToken: 't', repoFullName: 'o/r', webhookUrl: 'https://api.test/wh', secret: 's3cret' })).toEqual({ id: 9 })
    })

    it('GitHub closes an issue with state, GitLab with state_event, Gitea with state', async () => {
        nock(GITHUB_API).patch('/repos/o/r/issues/3', { state: 'closed' }).reply(200, {})
        nock(GITLAB_API).put('/projects/77/issues/3', { state_event: 'reopen' }).reply(200, {})
        nock(GITEA_API).patch('/repos/o/r/issues/3', { state: 'closed' }).reply(200, {})

        await updateGitHubIssueState('t', 'o/r', 3, 'closed')
        await updateGitLabIssueState('t', 77, 3, 'reopen')
        await updateGiteaIssueState({ accessToken: 't', repoFullName: 'o/r', issueNumber: 3, state: 'closed' })
    })
})

describe('webhook signature verification', () => {
    const body = Buffer.from('{"action":"opened"}')
    const secret = 'whsec'
    const hex = createHmac('sha256', secret).update(body).digest('hex')

    it('GitHub accepts the sha256= signature over the raw body', () => {
        expect(verifyGitHubWebhookSignature(body, `sha256=${hex}`, secret)).toBe(true)
    })

    it('GitHub rejects a signature computed with another secret', () => {
        const other = createHmac('sha256', 'nope').update(body).digest('hex')
        expect(verifyGitHubWebhookSignature(body, `sha256=${other}`, secret)).toBe(false)
    })

    it('GitHub rejects a signature of the wrong length instead of throwing', () => {
        expect(verifyGitHubWebhookSignature(body, 'sha256=abc', secret)).toBe(false)
        expect(verifyGitHubWebhookSignature(body, '', secret)).toBe(false)
    })

    it('GitHub rejects a valid digest for a different body', () => {
        expect(verifyGitHubWebhookSignature(Buffer.from('{"action":"closed"}'), `sha256=${hex}`, secret)).toBe(false)
    })

    it('Gitea uses the bare hex digest', () => {
        expect(verifyGiteaWebhookSignature({ rawBody: body, signature: hex, secret })).toBe(true)
        expect(verifyGiteaWebhookSignature({ rawBody: body, signature: `sha256=${hex}`, secret })).toBe(false)
        expect(verifyGiteaWebhookSignature({ rawBody: body, signature: 'zz', secret })).toBe(false)
    })

    it('GitLab compares the plain token', () => {
        expect(verifyGitLabWebhookToken('whsec', 'whsec')).toBe(true)
        expect(verifyGitLabWebhookToken('whsec ', 'whsec')).toBe(false)
        expect(verifyGitLabWebhookToken('', 'whsec')).toBe(false)
    })
})
