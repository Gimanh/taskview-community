import axios from 'axios';
import { createHash, randomBytes } from 'crypto';
import fs from 'fs/promises';
import type http from 'http';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import App from '../../../App';
import { Database } from '../../../modules/db';

const port = 1810;
const url = `http://localhost:${port}`;
const MIGRATION_DIR = join(__dirname, '../../../migrations/taskview/sql/1.64.0');

const LOGIN = 'test@mail.dest';
const PASSWORD = 'user1!#Q';

const REDIRECT_URI = 'https://client.integration.test/callback';

let server: http.Server;
let jwt = '';
let goalId = 0;

const verifier = () => randomBytes(40).toString('base64url');
const challengeFor = (value: string) => createHash('sha256').update(value).digest('base64url');
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

const api = axios.create({ baseURL: url, validateStatus: () => true });

async function registerClient(overrides: Record<string, unknown> = {}) {
    const response = await api.post('/module/oauth/register', {
        client_name: 'Integration Client',
        redirect_uris: [REDIRECT_URI],
        ...overrides,
    });
    return response;
}

/** Runs the browser half of the flow with the user's own session, returns the code. */
async function authorizeAndConsent(args: {
    clientId: string;
    codeChallenge: string;
    allowedPermissions?: string[];
    resource?: string;
    allowedGoalIds?: number[];
}) {
    const response = await api.post(
        '/module/oauth/consent',
        {
            client_id: args.clientId,
            redirect_uri: REDIRECT_URI,
            code_challenge: args.codeChallenge,
            code_challenge_method: 'S256',
            allowedPermissions: args.allowedPermissions ?? [],
            allowedGoalIds: args.allowedGoalIds ?? [],
            resource: args.resource,
        },
        { headers: { Authorization: `Bearer ${jwt}` } },
    );
    expect(response.status).toBe(200);
    return new URL(response.data.response.redirectUrl).searchParams.get('code') as string;
}

async function exchange(args: { clientId: string; code: string; codeVerifier: string; resource?: string }) {
    return api.post('/module/oauth/token', {
        grant_type: 'authorization_code',
        client_id: args.clientId,
        code: args.code,
        code_verifier: args.codeVerifier,
        redirect_uri: REDIRECT_URI,
        resource: args.resource,
    });
}

/** Full happy path, returns the issued token pair. */
async function connect(allowedPermissions: string[] = []) {
    const registered = await registerClient();
    const clientId = registered.data.client_id as string;
    const codeVerifier = verifier();
    const code = await authorizeAndConsent({ clientId, codeChallenge: challengeFor(codeVerifier), allowedPermissions });
    const tokens = await exchange({ clientId, code, codeVerifier });
    expect(tokens.status).toBe(200);
    return { clientId, ...tokens.data as { access_token: string; refresh_token: string; scope: string } };
}

describe('OAuth 2.1 authorization server', () => {
    vi.mock('emailjs', () => ({
        SMTPClient: vi.fn().mockImplementation(() => ({ sendAsync: vi.fn().mockResolvedValue(true) })),
    }));

    beforeAll(async () => {
        const db = Database.getInstance();
        const client = await db.getClient();

        // Apply migration 1.64.0 for real. The scripts are idempotent, and the
        // app's own runner is not usable here: it replays from the recorded
        // version and swallows SQL errors, so it would hide a broken script.
        for (const file of (await fs.readdir(MIGRATION_DIR)).sort()) {
            await client.query(await fs.readFile(join(MIGRATION_DIR, file), 'utf-8'));
        }
        client.release();

        server = new App(port).listen();

        const login = await api.post('/module/auth/login', { login: LOGIN, password: PASSWORD });
        expect(login.status).toBe(200);
        jwt = login.data.access;

        const goal = await api.post(
            '/module/goals',
            { name: `oauth-it-${Date.now()}` },
            { headers: { Authorization: `Bearer ${jwt}` } },
        );
        expect(goal.status).toBe(200);
        goalId = goal.data.response.id ?? goal.data.response.goal?.id;
    });

    afterAll(async () => {
        // HTTP cleanup has to happen while the server is still listening.
        if (goalId) {
            await api.delete('/module/goals', {
                headers: { Authorization: `Bearer ${jwt}` },
                data: { goalId },
            });
        }
        server?.close();

        // Clients cascade to their grants, and grants cascade to the access
        // tokens in api_tokens, so this one delete clears everything the run made.
        const db = Database.getInstance();
        await db.query("DELETE FROM tv_auth.oauth_clients WHERE name = 'Integration Client'");
    });

    describe('migration 1.64.0', () => {
        it('creates every OAuth table it declares', async () => {
            const db = Database.getInstance();
            const result = await db.query<{ table_name: string }>(
                `SELECT table_name FROM information_schema.tables
                 WHERE table_schema = 'tv_auth' AND table_name LIKE 'oauth%' ORDER BY 1`,
            );
            expect(result?.rows.map((row) => row.table_name)).toEqual([
                'oauth_auth_codes', 'oauth_clients', 'oauth_grants',
            ]);
        });

        it('names the grant column allowed_permissions, matching api_tokens', async () => {
            const db = Database.getInstance();
            const result = await db.query<{ column_name: string }>(
                `SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'tv_auth' AND table_name IN ('oauth_grants', 'oauth_auth_codes')
                   AND column_name = 'allowed_permissions'`,
            );
            expect(result?.rows.length).toBe(2);
        });

        it('adds grant_id to api_tokens', async () => {
            const db = Database.getInstance();
            const result = await db.query(
                `SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'tv_auth' AND table_name = 'api_tokens' AND column_name = 'grant_id'`,
            );
            expect(result?.rows.length).toBe(1);
        });
    });

    describe('discovery', () => {
        it('publishes authorization server metadata', async () => {
            const response = await api.get('/.well-known/oauth-authorization-server');

            expect(response.status).toBe(200);
            expect(response.data.code_challenge_methods_supported).toEqual(['S256']);
            expect(response.data.grant_types_supported).toContain('refresh_token');
            expect(response.data.authorization_endpoint).toContain('/module/oauth/authorize');
            expect(response.data.registration_endpoint).toContain('/module/oauth/register');
        });

        it('publishes protected resource metadata', async () => {
            const response = await api.get('/.well-known/oauth-protected-resource');

            expect(response.status).toBe(200);
            expect(response.data.authorization_servers.length).toBe(1);
            expect(response.data.bearer_methods_supported).toEqual(['header']);
            expect(response.data.resource).toBeTruthy();
        });
    });

    describe('dynamic client registration', () => {
        it('registers a public client without a secret', async () => {
            const response = await registerClient();

            expect(response.status).toBe(201);
            expect(response.data.client_id).toBeTruthy();
            expect(response.data.client_secret).toBeUndefined();
            expect(response.data.token_endpoint_auth_method).toBe('none');
        });

        it('refuses a non-https redirect_uri', async () => {
            const response = await registerClient({ redirect_uris: ['http://evil.example.com/cb'] });

            expect(response.status).toBe(400);
            expect(response.data.error).toBe('invalid_redirect_uri');
        });

        it('refuses a redirect_uri carrying a fragment', async () => {
            const response = await registerClient({ redirect_uris: ['https://client.test/cb#x'] });

            expect(response.status).toBe(400);
        });
    });

    describe('rejecting malformed requests', () => {
        it('refuses an unknown grant_type', async () => {
            const response = await api.post('/module/oauth/token', {
                grant_type: 'password',
                client_id: 'anything',
            });

            expect(response.status).toBe(400);
            expect(response.data.error).toBe('invalid_request');
        });

        it('refuses a token request with no client_id at all', async () => {
            const response = await api.post('/module/oauth/token', {
                grant_type: 'authorization_code',
                code: 'x',
                code_verifier: 'y',
                redirect_uri: REDIRECT_URI,
            });

            expect(response.status).toBe(401);
            expect(response.data.error).toBe('invalid_client');
        });

        it('refuses registration with an empty redirect_uris list', async () => {
            const response = await api.post('/module/oauth/register', {
                client_name: 'No redirects',
                redirect_uris: [],
            });

            expect(response.status).toBe(400);
        });

        it('refuses an authorize request missing the PKCE challenge', async () => {
            const registered = await registerClient();

            const response = await api.get('/module/oauth/authorize', {
                params: {
                    response_type: 'code',
                    client_id: registered.data.client_id,
                    redirect_uri: REDIRECT_URI,
                    code_challenge_method: 'S256',
                },
                maxRedirects: 0,
            });

            expect(response.status).toBe(400);
            expect(response.headers.location).toBeUndefined();
        });

        it('refuses a response_type other than code', async () => {
            const registered = await registerClient();

            const response = await api.get('/module/oauth/authorize', {
                params: {
                    response_type: 'token',
                    client_id: registered.data.client_id,
                    redirect_uri: REDIRECT_URI,
                    code_challenge: challengeFor(verifier()),
                    code_challenge_method: 'S256',
                },
                maxRedirects: 0,
            });

            expect(response.status).toBe(400);
        });
    });

    describe('/authorize', () => {
        it('redirects a valid request to the consent screen with its parameters intact', async () => {
            const registered = await registerClient();
            const codeVerifier = verifier();

            const response = await api.get('/module/oauth/authorize', {
                params: {
                    response_type: 'code',
                    client_id: registered.data.client_id,
                    redirect_uri: REDIRECT_URI,
                    code_challenge: challengeFor(codeVerifier),
                    code_challenge_method: 'S256',
                    scope: 'tasks.read',
                    state: 'xyz',
                },
                maxRedirects: 0,
            });

            expect(response.status).toBe(302);
            const location = new URL(response.headers.location);
            expect(location.pathname).toBe('/oauth/consent');
            expect(location.searchParams.get('state')).toBe('xyz');
            expect(location.searchParams.get('client_id')).toBe(registered.data.client_id);
        });

        it('refuses an unknown client without redirecting anywhere', async () => {
            const codeVerifier = verifier();
            const response = await api.get('/module/oauth/authorize', {
                params: {
                    response_type: 'code',
                    client_id: 'does-not-exist',
                    redirect_uri: REDIRECT_URI,
                    code_challenge: challengeFor(codeVerifier),
                    code_challenge_method: 'S256',
                },
                maxRedirects: 0,
            });

            expect(response.status).toBe(400);
            expect(response.headers.location).toBeUndefined();
        });

        it('refuses an unregistered redirect_uri without redirecting to it', async () => {
            const registered = await registerClient();
            const codeVerifier = verifier();

            const response = await api.get('/module/oauth/authorize', {
                params: {
                    response_type: 'code',
                    client_id: registered.data.client_id,
                    redirect_uri: 'https://attacker.example.com/steal',
                    code_challenge: challengeFor(codeVerifier),
                    code_challenge_method: 'S256',
                },
                maxRedirects: 0,
            });

            expect(response.status).toBe(400);
            expect(response.headers.location).toBeUndefined();
        });

        it('refuses a plain code_challenge_method', async () => {
            const registered = await registerClient();
            const response = await api.get('/module/oauth/authorize', {
                params: {
                    response_type: 'code',
                    client_id: registered.data.client_id,
                    redirect_uri: REDIRECT_URI,
                    code_challenge: 'anything',
                    code_challenge_method: 'plain',
                },
                maxRedirects: 0,
            });

            expect(response.status).toBe(400);
        });
    });

    describe('/consent', () => {
        it('requires a browser session', async () => {
            const registered = await registerClient();
            const response = await api.post('/module/oauth/consent', {
                client_id: registered.data.client_id,
                redirect_uri: REDIRECT_URI,
                code_challenge: challengeFor(verifier()),
                code_challenge_method: 'S256',
            });

            expect(response.status).toBe(401);
        });

        it('refuses a redirect_uri the client never registered', async () => {
            const registered = await registerClient();

            const response = await api.post(
                '/module/oauth/consent',
                {
                    client_id: registered.data.client_id,
                    redirect_uri: 'https://attacker.example.com/steal',
                    code_challenge: challengeFor(verifier()),
                    code_challenge_method: 'S256',
                    allowedPermissions: [],
                },
                { headers: { Authorization: `Bearer ${jwt}` } },
            );

            expect(response.status).toBe(400);
        });

        it('refuses a deny request pointing at an unregistered redirect_uri', async () => {
            const registered = await registerClient();

            const response = await api.post(
                '/module/oauth/consent/deny',
                {
                    client_id: registered.data.client_id,
                    redirect_uri: 'https://attacker.example.com/steal',
                    code_challenge: challengeFor(verifier()),
                    code_challenge_method: 'S256',
                },
                { headers: { Authorization: `Bearer ${jwt}` } },
            );

            expect(response.status).toBe(400);
        });

        it('returns a redirect carrying access_denied when the user declines', async () => {
            const registered = await registerClient();
            const response = await api.post(
                '/module/oauth/consent/deny',
                {
                    client_id: registered.data.client_id,
                    redirect_uri: REDIRECT_URI,
                    code_challenge: challengeFor(verifier()),
                    code_challenge_method: 'S256',
                    state: 'abc',
                },
                { headers: { Authorization: `Bearer ${jwt}` } },
            );

            expect(response.status).toBe(200);
            const redirect = new URL(response.data.response.redirectUrl);
            expect(redirect.searchParams.get('error')).toBe('access_denied');
            expect(redirect.searchParams.get('state')).toBe('abc');
            expect(redirect.searchParams.get('code')).toBeNull();
        });
    });

    describe('full authorization flow', () => {
        it('issues a tvo_ token that authenticates a real API call', async () => {
            const { access_token } = await connect();

            expect(access_token.startsWith('tvo_')).toBe(true);

            const goals = await api.get('/module/goals', {
                headers: { Authorization: `Bearer ${access_token}` },
            });

            expect(goals.status).toBe(200);
        });

        it('stores exactly the permissions the user ticked', async () => {
            const picked = ['goal_can_watch_content', 'task_can_edit_status'];
            const { access_token } = await connect(picked);

            const db = Database.getInstance();
            const result = await db.query<{ allowed_permissions: string[] }>(
                'SELECT allowed_permissions FROM tv_auth.api_tokens WHERE token_hash = $1',
                [sha256(access_token)],
            );

            expect(result?.rows[0].allowed_permissions).toEqual(picked);
        });

        it('leaves the token unrestricted when the user ticks nothing', async () => {
            const { access_token } = await connect([]);

            const db = Database.getInstance();
            const result = await db.query<{ allowed_permissions: string[] }>(
                'SELECT allowed_permissions FROM tv_auth.api_tokens WHERE token_hash = $1',
                [sha256(access_token)],
            );

            // Empty means "do not narrow", the same thing it means for a tvk_ token.
            expect(result?.rows[0].allowed_permissions).toEqual([]);
        });

        it('reports the granted permissions back through the connected-apps list', async () => {
            const picked = ['timetracking_can_view'];
            await connect(picked);

            const apps = await api.get('/module/oauth/connected-apps', {
                headers: { Authorization: `Bearer ${jwt}` },
            });

            expect(apps.status).toBe(200);
            const latest = apps.data.response.at(-1);
            expect(latest.allowedPermissions).toEqual(picked);
        });

        it('carries the ticked permissions through a refresh', async () => {
            const picked = ['goal_can_watch_content'];
            const { clientId, refresh_token } = await connect(picked);

            const refreshed = await api.post('/module/oauth/token', {
                grant_type: 'refresh_token',
                client_id: clientId,
                refresh_token,
            });
            expect(refreshed.status).toBe(200);

            const db = Database.getInstance();
            const result = await db.query<{ allowed_permissions: string[] }>(
                'SELECT allowed_permissions FROM tv_auth.api_tokens WHERE token_hash = $1',
                [sha256(refreshed.data.access_token)],
            );

            expect(result?.rows[0].allowed_permissions).toEqual(picked);
        });

        it('refuses to let an OAuth token reach an endpoint closed to token auth', async () => {
            const { access_token } = await connect();

            const response = await api.get('/module/api-tokens', {
                headers: { Authorization: `Bearer ${access_token}` },
            });

            expect(response.status).toBe(403);
        });

        it('denies a narrowly scoped token an operation outside its permissions', async () => {
            const { access_token } = await connect(['timetracking_can_view']);

            const response = await api.patch(
                '/module/goals',
                { id: goalId, name: 'renamed by a read-only token' },
                { headers: { Authorization: `Bearer ${access_token}` } },
            );

            expect(response.status).toBeGreaterThanOrEqual(400);
        });
    });

    describe('separation from manually issued tokens', () => {
        const apiTokenIdFor = async (accessToken: string) => {
            const db = Database.getInstance();
            const result = await db.query<{ id: number }>(
                'SELECT id FROM tv_auth.api_tokens WHERE token_hash = $1',
                [sha256(accessToken)],
            );
            return result?.rows[0]?.id;
        };

        it('hides OAuth access tokens from the API token list', async () => {
            const { access_token } = await connect();
            const id = await apiTokenIdFor(access_token);
            expect(id).toBeTruthy();

            const list = await api.get('/module/api-tokens', {
                headers: { Authorization: `Bearer ${jwt}` },
            });

            expect(list.status).toBe(200);
            expect(list.data.response.some((token: { id: number }) => token.id === id)).toBe(false);
        });

        it('refuses to delete an OAuth access token through the API token endpoint', async () => {
            const { access_token } = await connect();
            const id = await apiTokenIdFor(access_token);

            const deleted = await api.delete('/module/api-tokens', {
                headers: { Authorization: `Bearer ${jwt}` },
                data: { id },
            });

            expect(deleted.data.response).toBe(false);

            // Deleting from the wrong place must not silently look like it worked:
            // the connection is still alive.
            const stillWorks = await api.get('/module/goals', {
                headers: { Authorization: `Bearer ${access_token}` },
            });
            expect(stillWorks.status).toBe(200);
        });
    });

    describe('grants limited to selected projects', () => {
        it('sees only the project the user picked on the consent screen', async () => {
            const second = await api.post(
                '/module/goals',
                { name: `oauth-it-second-${Date.now()}` },
                { headers: { Authorization: `Bearer ${jwt}` } },
            );
            const secondGoalId = second.data.response.id;

            const registered = await registerClient();
            const clientId = registered.data.client_id;
            const codeVerifier = verifier();
            const code = await authorizeAndConsent({
                clientId,
                codeChallenge: challengeFor(codeVerifier),
                allowedGoalIds: [goalId],
            });
            const tokens = await exchange({ clientId, code, codeVerifier });
            expect(tokens.status).toBe(200);

            const goals = await api.get('/module/goals', {
                headers: { Authorization: `Bearer ${tokens.data.access_token}` },
            });

            const visible = goals.data.response.map((goal: { id: number }) => goal.id);
            expect(visible).toContain(goalId);
            expect(visible).not.toContain(secondGoalId);

            await api.delete('/module/goals', {
                headers: { Authorization: `Bearer ${jwt}` },
                data: { goalId: secondGoalId },
            });
        });

        it('records the choice on the connected app', async () => {
            const registered = await registerClient();
            const clientId = registered.data.client_id;
            const codeVerifier = verifier();
            const code = await authorizeAndConsent({
                clientId,
                codeChallenge: challengeFor(codeVerifier),
                allowedPermissions: ['timetracking_can_view'],
                allowedGoalIds: [goalId],
            });
            await exchange({ clientId, code, codeVerifier });

            const apps = await api.get('/module/oauth/connected-apps', {
                headers: { Authorization: `Bearer ${jwt}` },
            });
            const app = apps.data.response.find(
                (item: { clientId: string }) => item.clientId === clientId,
            );

            expect(app.clientName).toBe('Integration Client');
            expect(app.allowedPermissions).toEqual(['timetracking_can_view']);
            expect(app.allowedGoalIds).toEqual([goalId]);
        });
    });

    describe('authorization code hardening', () => {
        it('refuses a wrong code_verifier', async () => {
            const registered = await registerClient();
            const clientId = registered.data.client_id;
            const code = await authorizeAndConsent({
                clientId,
                codeChallenge: challengeFor(verifier()),
            });

            const response = await exchange({ clientId, code, codeVerifier: verifier() });

            expect(response.status).toBe(400);
            expect(response.data.error).toBe('invalid_grant');
        });

        it('accepts a code once and revokes the grant when it is replayed', async () => {
            const registered = await registerClient();
            const clientId = registered.data.client_id;
            const codeVerifier = verifier();
            const code = await authorizeAndConsent({
                clientId,
                codeChallenge: challengeFor(codeVerifier),
            });

            const first = await exchange({ clientId, code, codeVerifier });
            expect(first.status).toBe(200);

            const replay = await exchange({ clientId, code, codeVerifier });
            expect(replay.status).toBe(400);
            expect(replay.data.error).toBe('invalid_grant');

            // The replay must also kill the token the first exchange produced.
            const afterReplay = await api.get('/module/goals', {
                headers: { Authorization: `Bearer ${first.data.access_token}` },
            });
            expect(afterReplay.status).toBe(401);
        });

        it('lets exactly one of two concurrent exchanges win', async () => {
            const registered = await registerClient();
            const clientId = registered.data.client_id;
            const codeVerifier = verifier();
            const code = await authorizeAndConsent({
                clientId,
                codeChallenge: challengeFor(codeVerifier),
            });

            const [a, b] = await Promise.all([
                exchange({ clientId, code, codeVerifier }),
                exchange({ clientId, code, codeVerifier }),
            ]);

            const statuses = [a.status, b.status].sort();
            expect(statuses).toEqual([200, 400]);
        });

        it('refuses a code presented with a mismatched resource', async () => {
            const registered = await registerClient();
            const clientId = registered.data.client_id;
            const codeVerifier = verifier();
            const code = await authorizeAndConsent({
                clientId,
                codeChallenge: challengeFor(codeVerifier),
                resource: 'https://mcp.integration.test',
            });

            const response = await exchange({
                clientId,
                code,
                codeVerifier,
                resource: 'https://other.integration.test',
            });

            expect(response.status).toBe(400);
            expect(response.data.error).toBe('invalid_target');
        });
    });

    describe('confidential clients', () => {
        // DCR only ever creates public clients, so seed one with a secret the way
        // an operator would, and exercise both ways of presenting it.
        const CONFIDENTIAL_ID = 'integration-confidential';
        const CONFIDENTIAL_SECRET = 'integration-secret-value';

        const seedConfidentialClient = async () => {
            const db = Database.getInstance();
            await db.query(
                `INSERT INTO tv_auth.oauth_clients (client_id, client_secret_hash, name, redirect_uris, created_via)
                 VALUES ($1, $2, 'Confidential Client', ARRAY[$3], 'manual')
                 ON CONFLICT (client_id) DO NOTHING`,
                [CONFIDENTIAL_ID, sha256(CONFIDENTIAL_SECRET), REDIRECT_URI],
            );
        };

        const codeFor = async (codeVerifier: string) => authorizeAndConsent({
            clientId: CONFIDENTIAL_ID,
            codeChallenge: challengeFor(codeVerifier),
        });

        beforeAll(seedConfidentialClient);

        afterAll(async () => {
            const db = Database.getInstance();
            await db.query('DELETE FROM tv_auth.oauth_clients WHERE client_id = $1', [CONFIDENTIAL_ID]);
        });

        it('accepts the secret in the request body', async () => {
            const codeVerifier = verifier();
            const code = await codeFor(codeVerifier);

            const response = await api.post('/module/oauth/token', {
                grant_type: 'authorization_code',
                client_id: CONFIDENTIAL_ID,
                client_secret: CONFIDENTIAL_SECRET,
                code,
                code_verifier: codeVerifier,
                redirect_uri: REDIRECT_URI,
            });

            expect(response.status).toBe(200);
            expect(response.data.access_token.startsWith('tvo_')).toBe(true);
        });

        it('accepts the secret via HTTP Basic authentication', async () => {
            const codeVerifier = verifier();
            const code = await codeFor(codeVerifier);
            const basic = Buffer.from(`${CONFIDENTIAL_ID}:${CONFIDENTIAL_SECRET}`).toString('base64');

            const response = await api.post(
                '/module/oauth/token',
                {
                    grant_type: 'authorization_code',
                    code,
                    code_verifier: codeVerifier,
                    redirect_uri: REDIRECT_URI,
                },
                { headers: { Authorization: `Basic ${basic}` } },
            );

            expect(response.status).toBe(200);
            expect(response.data.access_token.startsWith('tvo_')).toBe(true);
        });

        it('refuses a wrong secret', async () => {
            const codeVerifier = verifier();
            const code = await codeFor(codeVerifier);

            const response = await api.post('/module/oauth/token', {
                grant_type: 'authorization_code',
                client_id: CONFIDENTIAL_ID,
                client_secret: 'not-the-secret',
                code,
                code_verifier: codeVerifier,
                redirect_uri: REDIRECT_URI,
            });

            expect(response.status).toBe(401);
            expect(response.data.error).toBe('invalid_client');
        });

        it('refuses a missing secret — PKCE alone is not enough for a confidential client', async () => {
            const codeVerifier = verifier();
            const code = await codeFor(codeVerifier);

            const response = await api.post('/module/oauth/token', {
                grant_type: 'authorization_code',
                client_id: CONFIDENTIAL_ID,
                code,
                code_verifier: codeVerifier,
                redirect_uri: REDIRECT_URI,
            });

            expect(response.status).toBe(401);
        });
    });

    describe('token lifetime', () => {
        it('stops accepting an access token once it expires', async () => {
            const { access_token } = await connect();

            const before = await api.get('/module/goals', {
                headers: { Authorization: `Bearer ${access_token}` },
            });
            expect(before.status).toBe(200);

            const db = Database.getInstance();
            await db.query(
                "UPDATE tv_auth.api_tokens SET expires_at = now() - interval '1 minute' WHERE token_hash = $1",
                [sha256(access_token)],
            );

            const after = await api.get('/module/goals', {
                headers: { Authorization: `Bearer ${access_token}` },
            });
            expect(after.status).toBe(401);
        });

        it('issues access tokens with an expiry, never an endless one', async () => {
            const { access_token } = await connect();

            const db = Database.getInstance();
            const result = await db.query<{ expires_at: Date | null }>(
                'SELECT expires_at FROM tv_auth.api_tokens WHERE token_hash = $1',
                [sha256(access_token)],
            );

            expect(result?.rows[0].expires_at).toBeTruthy();
        });

        it('refuses an expired refresh token', async () => {
            const { clientId, refresh_token } = await connect();

            const db = Database.getInstance();
            await db.query(
                "UPDATE tv_auth.oauth_grants SET refresh_expires_at = now() - interval '1 minute' WHERE refresh_token_hash = $1",
                [sha256(refresh_token)],
            );

            const response = await api.post('/module/oauth/token', {
                grant_type: 'refresh_token',
                client_id: clientId,
                refresh_token,
            });

            expect(response.status).toBe(400);
            expect(response.data.error).toBe('invalid_grant');
        });
    });

    describe('refresh token rotation', () => {
        it('rotates the refresh token and keeps the new access token working', async () => {
            const { clientId, refresh_token } = await connect();

            const refreshed = await api.post('/module/oauth/token', {
                grant_type: 'refresh_token',
                client_id: clientId,
                refresh_token,
            });

            expect(refreshed.status).toBe(200);
            expect(refreshed.data.refresh_token).not.toBe(refresh_token);

            const goals = await api.get('/module/goals', {
                headers: { Authorization: `Bearer ${refreshed.data.access_token}` },
            });
            expect(goals.status).toBe(200);
        });

        it('revokes the whole grant when a superseded refresh token is replayed', async () => {
            const { clientId, refresh_token } = await connect();

            const refreshed = await api.post('/module/oauth/token', {
                grant_type: 'refresh_token',
                client_id: clientId,
                refresh_token,
            });
            expect(refreshed.status).toBe(200);

            const replay = await api.post('/module/oauth/token', {
                grant_type: 'refresh_token',
                client_id: clientId,
                refresh_token,
            });
            expect(replay.status).toBe(400);

            // Replay burns the grant, so the freshly rotated access token dies too.
            const goals = await api.get('/module/goals', {
                headers: { Authorization: `Bearer ${refreshed.data.access_token}` },
            });
            expect(goals.status).toBe(401);
        });
    });

    describe('concurrent refresh', () => {
        it('lets exactly one of two simultaneous refreshes win', async () => {
            const { clientId, refresh_token } = await connect();

            const refresh = () => api.post('/module/oauth/token', {
                grant_type: 'refresh_token',
                client_id: clientId,
                refresh_token,
            });

            const [a, b] = await Promise.all([refresh(), refresh()]);

            expect([a.status, b.status].sort()).toEqual([200, 400]);
        });

        it('keeps the winning refresh token usable afterwards', async () => {
            const { clientId, refresh_token } = await connect();

            const refresh = (token: string) => api.post('/module/oauth/token', {
                grant_type: 'refresh_token',
                client_id: clientId,
                refresh_token: token,
            });

            const [a, b] = await Promise.all([refresh(refresh_token), refresh(refresh_token)]);
            const winner = a.status === 200 ? a : b;

            // Before the fix the loser overwrote the winner's rotation, orphaning
            // the refresh token that had just been handed to the real client.
            const next = await refresh(winner.data.refresh_token);

            expect(next.status).toBe(200);
        });

        it('refuses a refresh whose resource does not match the grant', async () => {
            const registered = await registerClient();
            const clientId = registered.data.client_id;
            const codeVerifier = verifier();
            const code = await authorizeAndConsent({
                clientId,
                codeChallenge: challengeFor(codeVerifier),
                resource: 'https://mcp.integration.test',
            });
            const tokens = await exchange({ clientId, code, codeVerifier, resource: 'https://mcp.integration.test' });
            expect(tokens.status).toBe(200);

            const response = await api.post('/module/oauth/token', {
                grant_type: 'refresh_token',
                client_id: clientId,
                refresh_token: tokens.data.refresh_token,
                resource: 'https://other.integration.test',
            });

            expect(response.status).toBe(400);
            expect(response.data.error).toBe('invalid_target');
        });
    });

    describe('revocation', () => {
        it('kills the access token immediately when the user disconnects the app', async () => {
            const { access_token } = await connect();

            const before = await api.get('/module/goals', {
                headers: { Authorization: `Bearer ${access_token}` },
            });
            expect(before.status).toBe(200);

            const db = Database.getInstance();
            const owning = await db.query<{ grant_id: number }>(
                'SELECT grant_id FROM tv_auth.api_tokens WHERE token_hash = $1',
                [sha256(access_token)],
            );
            const grantId = owning?.rows[0].grant_id;

            const apps = await api.get('/module/oauth/connected-apps', {
                headers: { Authorization: `Bearer ${jwt}` },
            });
            expect(apps.status).toBe(200);
            expect(apps.data.response.some((app: { grantId: number }) => app.grantId === grantId)).toBe(true);

            const revoked = await api.delete('/module/oauth/connected-apps', {
                headers: { Authorization: `Bearer ${jwt}` },
                data: { grantId },
            });
            expect(revoked.status).toBe(200);

            const after = await api.get('/module/goals', {
                headers: { Authorization: `Bearer ${access_token}` },
            });
            expect(after.status).toBe(401);
        });

        it('kills a live access token presented to /revoke', async () => {
            const { access_token } = await connect();

            const revoked = await api.post('/module/oauth/revoke', { token: access_token });
            expect(revoked.status).toBe(200);

            const after = await api.get('/module/goals', {
                headers: { Authorization: `Bearer ${access_token}` },
            });
            expect(after.status).toBe(401);
        });

        it('kills the grant when a refresh token is presented to /revoke', async () => {
            const { clientId, access_token, refresh_token } = await connect();

            const revoked = await api.post('/module/oauth/revoke', { token: refresh_token });
            expect(revoked.status).toBe(200);

            const refreshed = await api.post('/module/oauth/token', {
                grant_type: 'refresh_token',
                client_id: clientId,
                refresh_token,
            });
            expect(refreshed.status).toBe(400);

            // Revoking the grant takes its live access tokens with it.
            const after = await api.get('/module/goals', {
                headers: { Authorization: `Bearer ${access_token}` },
            });
            expect(after.status).toBe(401);
        });

        it('does not let one user revoke another user\'s grant', async () => {
            const { access_token } = await connect();

            const db = Database.getInstance();
            const owning = await db.query<{ grant_id: number }>(
                'SELECT grant_id FROM tv_auth.api_tokens WHERE token_hash = $1',
                [sha256(access_token)],
            );
            const grantId = owning?.rows[0].grant_id;

            // Hand the grant to somebody else, then try to revoke it as the caller.
            const stamp = Date.now();
            const other = await db.query<{ id: number }>(
                `INSERT INTO tv_auth.users (login, email, password, confirm_email_code, block)
                 VALUES ($1, $2, 'x', $3, 0) RETURNING id`,
                [`grant-owner-${stamp}`, `grant-owner-${stamp}@test.dest`, `code-${stamp}`],
            );
            const otherUserId = other?.rows[0]?.id;
            expect(otherUserId).toBeTruthy();

            await db.query('UPDATE tv_auth.oauth_grants SET user_id = $1 WHERE id = $2', [otherUserId, grantId]);

            const response = await api.delete('/module/oauth/connected-apps', {
                headers: { Authorization: `Bearer ${jwt}` },
                data: { grantId },
            });

            expect(response.data.response).toBe(false);

            // The victim's access token must still work — nothing was revoked.
            const stillWorks = await api.get('/module/goals', {
                headers: { Authorization: `Bearer ${access_token}` },
            });
            expect(stillWorks.status).toBe(200);

            await db.query('DELETE FROM tv_auth.oauth_grants WHERE id = $1', [grantId]);
            await db.query('DELETE FROM tv_auth.users WHERE id = $1', [otherUserId]);
        });

        it('rejects a grantId that is not a positive integer', async () => {
            const response = await api.delete('/module/oauth/connected-apps', {
                headers: { Authorization: `Bearer ${jwt}` },
                data: { grantId: 'not-a-number' },
            });

            expect(response.status).toBe(400);
        });

        it('answers 200 to RFC 7009 revocation of an unknown token', async () => {
            const response = await api.post('/module/oauth/revoke', { token: 'tvo_nope' });

            expect(response.status).toBe(200);
        });
    });
});
