import axios from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';
import type { GiteaCreateWebhookArgs, GiteaFetchIssuesArgs, GiteaUpdateIssueStateArgs, GiteaVerifyWebhookSignatureArgs } from '../types';

export const GITEA_BASE_URL = (process.env.GITEA_BASE_URL || 'https://gitea.com').replace(/\/+$/, '');
const GITEA_API_URL = process.env.GITEA_API_URL || `${GITEA_BASE_URL}/api/v1`;

export type GiteaRepo = {
    id: number;
    full_name: string;
    name: string;
    private: boolean;
    description: string | null;
    html_url: string;
};

export type GiteaIssue = {
    number: number;
    title: string;
    body: string | null;
    state: 'open' | 'closed';
    html_url: string;
};

export function getGiteaOAuthUrl(state: string): string {
    const clientId = process.env.GITEA_INTEGRATION_CLIENT_ID;
    const redirectUri = process.env.GITEA_INTEGRATION_CALLBACK_URL;
    if (!clientId || !redirectUri) {
        throw new Error('Gitea integration OAuth is not configured');
    }
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        state,
    });
    return `${GITEA_BASE_URL}/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeGiteaCode(code: string): Promise<{ accessToken: string; refreshToken: string | null }> {
    const res = await axios.post<{ access_token: string; refresh_token?: string; token_type: string }>(
        `${GITEA_BASE_URL}/login/oauth/access_token`,
        {
            client_id: process.env.GITEA_INTEGRATION_CLIENT_ID,
            client_secret: process.env.GITEA_INTEGRATION_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: process.env.GITEA_INTEGRATION_CALLBACK_URL,
        },
        {
            headers: { Accept: 'application/json' },
        },
    );
    if (!res.data.access_token) {
        throw new Error('Failed to exchange Gitea code for token');
    }
    return {
        accessToken: res.data.access_token,
        refreshToken: res.data.refresh_token ?? null,
    };
}

export async function refreshGiteaToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const res = await axios.post<{ access_token: string; refresh_token: string; token_type: string }>(
        `${GITEA_BASE_URL}/login/oauth/access_token`,
        {
            client_id: process.env.GITEA_INTEGRATION_CLIENT_ID,
            client_secret: process.env.GITEA_INTEGRATION_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        },
        {
            headers: { Accept: 'application/json' },
        },
    );
    if (!res.data.access_token) {
        throw new Error('Failed to refresh Gitea token');
    }
    return {
        accessToken: res.data.access_token,
        refreshToken: res.data.refresh_token,
    };
}

export async function verifyGiteaToken(accessToken: string): Promise<void> {
    await axios.get(`${GITEA_API_URL}/user`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

export async function fetchGiteaRepos(accessToken: string): Promise<GiteaRepo[]> {
    const repos: GiteaRepo[] = [];
    let page = 1;
    const perPage = 50;

    while (true) {
        const res = await axios.get<GiteaRepo[]>(`${GITEA_API_URL}/user/repos`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            params: {
                limit: perPage,
                page,
            },
        });
        repos.push(...res.data);
        if (res.data.length < perPage) break;
        page++;
    }

    return repos;
}

export async function fetchGiteaIssues(args: GiteaFetchIssuesArgs): Promise<GiteaIssue[]> {
    const issues: GiteaIssue[] = [];
    let page = 1;
    const perPage = 50;

    while (true) {
        const res = await axios.get<GiteaIssue[]>(`${GITEA_API_URL}/repos/${args.repoFullName}/issues`, {
            headers: {
                Authorization: `Bearer ${args.accessToken}`,
            },
            params: {
                state: 'all',
                // Gitea returns pull requests from the issues endpoint too — this excludes them
                type: 'issues',
                limit: perPage,
                page,
                ...(args.since ? { since: args.since } : {}),
            },
        });
        issues.push(...res.data);
        if (res.data.length < perPage) break;
        page++;
    }

    return issues;
}

export async function createGiteaWebhook(args: GiteaCreateWebhookArgs): Promise<{ id: number }> {
    const res = await axios.post<{ id: number }>(
        `${GITEA_API_URL}/repos/${args.repoFullName}/hooks`,
        {
            type: 'gitea',
            active: true,
            events: ['issues'],
            config: {
                url: args.webhookUrl,
                content_type: 'json',
                secret: args.secret,
            },
        },
        {
            headers: {
                Authorization: `Bearer ${args.accessToken}`,
            },
        },
    );
    return { id: res.data.id };
}

export function verifyGiteaWebhookSignature(args: GiteaVerifyWebhookSignatureArgs): boolean {
    const expected = createHmac('sha256', args.secret).update(args.rawBody).digest('hex');
    try {
        return timingSafeEqual(Buffer.from(args.signature), Buffer.from(expected));
    } catch {
        return false;
    }
}

export async function updateGiteaIssueState(args: GiteaUpdateIssueStateArgs): Promise<void> {
    await axios.patch(
        `${GITEA_API_URL}/repos/${args.repoFullName}/issues/${args.issueNumber}`,
        { state: args.state },
        {
            headers: {
                Authorization: `Bearer ${args.accessToken}`,
            },
        },
    );
}
