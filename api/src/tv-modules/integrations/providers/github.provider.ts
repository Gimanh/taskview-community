import axios from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';

export const GITHUB_BASE_URL = process.env.GITHUB_BASE_URL || 'https://github.com';
const GITHUB_API_URL = process.env.GITHUB_API_URL || 'https://api.github.com';
const GITHUB_OAUTH_URL = `${GITHUB_BASE_URL}/login/oauth/authorize`;
const GITHUB_TOKEN_URL = `${GITHUB_BASE_URL}/login/oauth/access_token`;

export type GitHubRepo = {
    id: number;
    full_name: string;
    name: string;
    private: boolean;
    description: string | null;
    html_url: string;
};

export type GitHubIssue = {
    number: number;
    title: string;
    body: string | null;
    state: 'open' | 'closed';
    html_url: string;
    pull_request?: unknown;
};

export function getGitHubOAuthUrl(state: string): string {
    const clientId = process.env.GITHUB_INTEGRATION_CLIENT_ID;
    const redirectUri = process.env.GITHUB_INTEGRATION_CALLBACK_URL;
    if (!clientId || !redirectUri) {
        throw new Error('GitHub integration OAuth is not configured');
    }
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'repo',
        state,
    });
    return `${GITHUB_OAUTH_URL}?${params.toString()}`;
}

export async function exchangeGitHubCode(code: string): Promise<string> {
    const res = await axios.post<{ access_token: string; token_type: string }>(
        GITHUB_TOKEN_URL,
        {
            client_id: process.env.GITHUB_INTEGRATION_CLIENT_ID,
            client_secret: process.env.GITHUB_INTEGRATION_CLIENT_SECRET,
            code,
        },
        {
            headers: { Accept: 'application/json' },
        }
    );
    if (!res.data.access_token) {
        throw new Error('Failed to exchange GitHub code for token');
    }
    return res.data.access_token;
}

export async function fetchGitHubRepos(accessToken: string): Promise<GitHubRepo[]> {
    const repos: GitHubRepo[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
        const res = await axios.get<GitHubRepo[]>(`${GITHUB_API_URL}/user/repos`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github+json',
            },
            params: {
                per_page: perPage,
                page,
                sort: 'updated',
                direction: 'desc',
            },
        });
        repos.push(...res.data);
        if (res.data.length < perPage) break;
        page++;
    }

    return repos;
}

export async function fetchGitHubIssues(accessToken: string, repoFullName: string, since?: string): Promise<GitHubIssue[]> {
    const issues: GitHubIssue[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
        const res = await axios.get<GitHubIssue[]>(`${GITHUB_API_URL}/repos/${repoFullName}/issues`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github+json',
            },
            params: {
                state: 'all',
                per_page: perPage,
                page,
                sort: since ? 'updated' : 'created',
                direction: 'desc',
                ...(since ? { since } : {}),
            },
        });
        // GitHub API returns pull requests as issues too — filter them out
        const realIssues = res.data.filter((i) => !i.pull_request);
        issues.push(...realIssues);
        if (res.data.length < perPage) break;
        page++;
    }

    return issues;
}

export async function createGitHubWebhook(
    accessToken: string,
    repoFullName: string,
    webhookUrl: string,
    secret: string,
): Promise<{ id: number }> {
    const res = await axios.post<{ id: number }>(
        `${GITHUB_API_URL}/repos/${repoFullName}/hooks`,
        {
            name: 'web',
            active: true,
            events: ['issues'],
            config: {
                url: webhookUrl,
                content_type: 'json',
                secret,
            },
        },
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github+json',
            },
        },
    );
    return { id: res.data.id };
}

export function verifyGitHubWebhookSignature(rawBody: Buffer, signature: string, secret: string): boolean {
    const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
        return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
        return false;
    }
}

export async function updateGitHubIssueState(
    accessToken: string,
    repoFullName: string,
    issueNumber: number,
    state: 'open' | 'closed',
): Promise<void> {
    await axios.patch(
        `${GITHUB_API_URL}/repos/${repoFullName}/issues/${issueNumber}`,
        { state },
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github+json',
            },
        },
    );
}
