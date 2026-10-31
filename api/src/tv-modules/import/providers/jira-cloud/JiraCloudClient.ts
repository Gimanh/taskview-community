import type { Readable } from 'stream';
import { ImportHttpClient } from '../../core/ImportHttpClient';
import { ImportProviderError } from '../../core/ImportProviderError';
import { IMPORT_MAX_TASKS } from '../../types';
import type {
    JiraCloudComment,
    JiraCloudCommentPage,
    JiraCloudCredentials,
    JiraCloudIssue,
    JiraCloudIssueTypeStatuses,
    JiraCloudProject,
    JiraCloudProjectPage,
    JiraCloudSearchArgs,
    JiraCloudSearchPage,
    JiraCloudStatus,
    JiraCloudUser,
} from './jira-cloud.types';

const SEARCH_PAGE_SIZE = 100;
const PROJECT_PAGE_SIZE = 100;
const COMMENT_PAGE_SIZE = 100;
const MAX_PAGES = 1000;
const MIN_REQUEST_INTERVAL_MS = 100;

export class JiraCloudClient {
    private readonly http: ImportHttpClient;

    constructor(credentials: JiraCloudCredentials) {
        const basic = Buffer.from(`${credentials.email}:${credentials.token}`).toString('base64');
        this.http = new ImportHttpClient({
            providerName: 'JiraCloud',
            baseUrl: credentials.siteUrl,
            headers: { Authorization: `Basic ${basic}` },
            minRequestIntervalMs: MIN_REQUEST_INTERVAL_MS,
            maxRedirects: 0,
        });
    }

    async fetchMyself(): Promise<JiraCloudUser> {
        return this.http.get<JiraCloudUser>({ path: '/rest/api/3/myself' });
    }

    async fetchProjects(): Promise<JiraCloudProject[]> {
        const projects: JiraCloudProject[] = [];
        for (let pageIndex = 0; ; pageIndex++) {
            if (pageIndex >= MAX_PAGES) throw new ImportProviderError('too_large', 'Jira returned too many projects');
            const page = await this.http.get<JiraCloudProjectPage>({
                path: '/rest/api/3/project/search',
                params: { startAt: projects.length, maxResults: PROJECT_PAGE_SIZE, orderBy: 'name' },
            });
            projects.push(...page.values);
            if (page.isLast !== false || page.values.length === 0) break;
        }
        return projects;
    }

    async fetchProject(projectId: string): Promise<JiraCloudProject> {
        return this.http.get<JiraCloudProject>({
            path: `/rest/api/3/project/${encodeURIComponent(projectId)}`,
            params: { expand: 'description' },
        });
    }

    async fetchStatuses(projectId: string): Promise<JiraCloudStatus[]> {
        const issueTypes = await this.http.get<JiraCloudIssueTypeStatuses[]>({
            path: `/rest/api/3/project/${encodeURIComponent(projectId)}/statuses`,
        });
        const statuses = new Map<string, JiraCloudStatus>();
        for (const issueType of issueTypes) {
            for (const status of issueType.statuses) {
                if (!statuses.has(status.id)) statuses.set(status.id, status);
            }
        }
        return [...statuses.values()];
    }

    async searchIssues(args: JiraCloudSearchArgs): Promise<JiraCloudIssue[]> {
        const issues = new Map<string, JiraCloudIssue>();
        let nextPageToken: string | null = null;
        for (let pageIndex = 0; ; pageIndex++) {
            if (pageIndex >= MAX_PAGES) throw new ImportProviderError('too_large', 'Jira returned too many pages');
            const params: Record<string, string | number> = {
                jql: args.jql,
                fields: args.fields.join(','),
                maxResults: SEARCH_PAGE_SIZE,
            };
            if (nextPageToken) params.nextPageToken = nextPageToken;
            const page: JiraCloudSearchPage = await this.http.get<JiraCloudSearchPage>({ path: '/rest/api/3/search/jql', params });
            for (const issue of page.issues) issues.set(issue.id, issue);
            if (issues.size > IMPORT_MAX_TASKS) throw new ImportProviderError('too_large', 'Jira project has too many issues');
            nextPageToken = page.nextPageToken ?? null;
            if (!nextPageToken || page.isLast) break;
        }
        return [...issues.values()];
    }

    async fetchComments(issueId: string): Promise<JiraCloudComment[]> {
        const comments: JiraCloudComment[] = [];
        for (let pageIndex = 0; ; pageIndex++) {
            if (pageIndex >= MAX_PAGES) throw new ImportProviderError('too_large', 'Jira issue has too many comments');
            const page = await this.http.get<JiraCloudCommentPage>({
                path: `/rest/api/3/issue/${encodeURIComponent(issueId)}/comment`,
                params: { startAt: comments.length, maxResults: COMMENT_PAGE_SIZE, orderBy: 'created' },
            });
            comments.push(...page.comments);
            if (page.comments.length === 0 || comments.length >= (page.total ?? 0)) break;
        }
        return comments;
    }

    async download(attachmentId: string): Promise<Readable> {
        return this.http.stream(`/rest/api/3/attachment/content/${encodeURIComponent(attachmentId)}?redirect=false`);
    }
}
