import type { Readable } from 'stream';
import { OutboundUrlError } from '../../../../utils/OutboundUrlError';
import { resolveOutboundUrl } from '../../../../utils/outbound-url';
import { ImportHttpClient } from '../../core/ImportHttpClient';
import { ImportProviderError } from '../../core/ImportProviderError';
import type { ImportHttpRequestArgs } from '../../core/import-provider.types';
import { isPrivateImportUrlsAllowed } from '../../import.utils';
import { IMPORT_MAX_TASKS } from '../../types';
import type {
    JiraDcComment,
    JiraDcCommentPage,
    JiraDcCredentials,
    JiraDcDownloadRef,
    JiraDcField,
    JiraDcIssue,
    JiraDcIssueTypeStatuses,
    JiraDcProject,
    JiraDcSearchArgs,
    JiraDcSearchPage,
    JiraDcStatus,
    JiraDcUser,
} from './jira-dc.types';

const SEARCH_PAGE_SIZE = 100;
const COMMENT_PAGE_SIZE = 100;
const MAX_PAGES = 1000;
const MIN_REQUEST_INTERVAL_MS = 100;

// The base URL is user-supplied, so every request first passes the shared SSRF guard and redirects are never followed
export class JiraDcClient {
    private readonly http: ImportHttpClient;
    private readonly siteUrl: string;
    private allowed: Promise<void> | null = null;

    constructor(credentials: JiraDcCredentials) {
        this.siteUrl = credentials.siteUrl;
        this.http = new ImportHttpClient({
            providerName: 'JiraDc',
            baseUrl: credentials.siteUrl,
            headers: { Authorization: `Bearer ${credentials.token}` },
            minRequestIntervalMs: MIN_REQUEST_INTERVAL_MS,
            maxRedirects: 0,
        });
    }

    async fetchMyself(): Promise<JiraDcUser> {
        return this.get<JiraDcUser>({ path: '/rest/api/2/myself' });
    }

    async fetchProjects(): Promise<JiraDcProject[]> {
        return this.get<JiraDcProject[]>({ path: '/rest/api/2/project' });
    }

    async fetchProject(projectId: string): Promise<JiraDcProject> {
        return this.get<JiraDcProject>({ path: `/rest/api/2/project/${encodeURIComponent(projectId)}` });
    }

    async fetchStatuses(projectId: string): Promise<JiraDcStatus[]> {
        const issueTypes = await this.get<JiraDcIssueTypeStatuses[]>({
            path: `/rest/api/2/project/${encodeURIComponent(projectId)}/statuses`,
        });
        const statuses = new Map<string, JiraDcStatus>();
        for (const issueType of issueTypes) {
            for (const status of issueType.statuses) {
                if (!statuses.has(status.id)) statuses.set(status.id, status);
            }
        }
        return [...statuses.values()];
    }

    async fetchFields(): Promise<JiraDcField[]> {
        return this.get<JiraDcField[]>({ path: '/rest/api/2/field' });
    }

    async searchIssues(args: JiraDcSearchArgs): Promise<JiraDcIssue[]> {
        const issues = new Map<string, JiraDcIssue>();
        let startAt = 0;
        for (let pageIndex = 0; ; pageIndex++) {
            if (pageIndex >= MAX_PAGES) throw new ImportProviderError('too_large', 'Jira returned too many pages');
            const page = await this.get<JiraDcSearchPage>({
                path: '/rest/api/2/search',
                params: { jql: args.jql, fields: args.fields.join(','), startAt, maxResults: SEARCH_PAGE_SIZE },
            });
            for (const issue of page.issues) issues.set(issue.id, issue);
            if (issues.size > IMPORT_MAX_TASKS) throw new ImportProviderError('too_large', 'Jira project has too many issues');
            startAt += page.issues.length;
            if (page.issues.length === 0 || startAt >= (page.total ?? 0)) break;
        }
        return [...issues.values()];
    }

    async fetchComments(issueId: string): Promise<JiraDcComment[]> {
        const comments: JiraDcComment[] = [];
        for (let pageIndex = 0; ; pageIndex++) {
            if (pageIndex >= MAX_PAGES) throw new ImportProviderError('too_large', 'Jira issue has too many comments');
            const page = await this.get<JiraDcCommentPage>({
                path: `/rest/api/2/issue/${encodeURIComponent(issueId)}/comment`,
                params: { startAt: comments.length, maxResults: COMMENT_PAGE_SIZE, orderBy: 'created' },
            });
            comments.push(...page.comments);
            if (page.comments.length === 0 || comments.length >= (page.total ?? 0)) break;
        }
        return comments;
    }

    async download(ref: JiraDcDownloadRef): Promise<Readable> {
        await this.ensureAllowed();
        return this.http.stream(`/secure/attachment/${encodeURIComponent(ref.id)}/${encodeURIComponent(ref.filename)}`);
    }

    private async get<T>(args: ImportHttpRequestArgs): Promise<T> {
        await this.ensureAllowed();
        return this.http.get<T>(args);
    }

    private ensureAllowed(): Promise<void> {
        this.allowed ??= resolveOutboundUrl({ url: this.siteUrl, allowPrivate: isPrivateImportUrlsAllowed() }).then(
            () => undefined,
            (err: unknown) => {
                this.allowed = null;
                if (err instanceof OutboundUrlError && err.code === 'private') {
                    throw new ImportProviderError('private_url', 'Jira address points to a private network');
                }
                if (err instanceof OutboundUrlError) throw new ImportProviderError('invalid_url', `Jira address ${err.message}`);
                throw err;
            },
        );
        return this.allowed;
    }
}
