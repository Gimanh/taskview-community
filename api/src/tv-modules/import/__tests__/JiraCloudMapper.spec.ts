import { describe, expect, it } from 'vitest';
import { JiraCloudMapper } from '../providers/jira-cloud/JiraCloudMapper';
import type { JiraCloudIssue, JiraCloudIssueFields, JiraCloudOptions, JiraCloudProjectSnapshot } from '../providers/jira-cloud/jira-cloud.types';

const defaultOptions: JiraCloudOptions = {
    epicsAs: 'list',
    includeDone: true,
    commentsToNote: true,
    includeAttachments: true,
};

const todo = { id: '1', name: 'To Do', statusCategory: { key: 'new' } };
const doing = { id: '3', name: 'In Progress', statusCategory: { key: 'indeterminate' } };
const done = { id: '10001', name: 'Done', statusCategory: { key: 'done' } };

function issue(id: string, fields: Partial<JiraCloudIssueFields> = {}): JiraCloudIssue {
    return {
        id,
        key: `PRJ-${id}`,
        fields: { summary: `Issue ${id}`, status: todo, issuetype: { name: 'Task', hierarchyLevel: 0 }, ...fields },
    };
}

const epic = (id: string) => issue(id, { summary: `Epic ${id}`, issuetype: { name: 'Epic', hierarchyLevel: 1 } });

function snapshot(issues: JiraCloudIssue[], comments: JiraCloudProjectSnapshot['commentsByIssue'] = new Map()): JiraCloudProjectSnapshot {
    return {
        project: { id: '100', key: 'PRJ', name: ' Web   app ', description: 'About' },
        statuses: [done, todo, doing],
        issues,
        commentsByIssue: comments,
    };
}

function mapper(data: JiraCloudProjectSnapshot, options: Partial<JiraCloudOptions> = {}) {
    return new JiraCloudMapper({ snapshot: data, siteUrl: 'https://acme.atlassian.net', options: { ...defaultOptions, ...options }, locale: 'en' });
}

describe('JiraCloudMapper', () => {
    it('orders statuses by category and maps them to columns', () => {
        const structure = mapper(snapshot([issue('1')])).structure();
        expect(structure.projectName).toBe('Web app');
        expect(structure.statuses.map((status) => status.name)).toEqual(['To Do', 'In Progress', 'Done']);
    });

    it('turns epics into lists and keeps the epic itself as a task in its list', () => {
        const result = mapper(snapshot([epic('10'), issue('11', { parent: { id: '10' } }), issue('12')]));
        expect(result.structure().lists).toEqual([{ externalId: '10', name: 'Epic 10' }]);
        expect(result.tasks().map((task) => [task.externalId, task.parentExternalId, task.listExternalId, task.statusExternalId])).toEqual([
            ['10', null, '10', '1'],
            ['11', null, '10', '1'],
            ['12', null, null, '1'],
        ]);
    });

    it('nests epic children and sub-tasks as subtasks when epics become tasks', () => {
        const subtask = issue('13', { parent: { id: '11' }, issuetype: { name: 'Sub-task', subtask: true, hierarchyLevel: -1 } });
        const tasks = mapper(snapshot([subtask, epic('10'), issue('11', { parent: { id: '10' } })]), { epicsAs: 'task' }).tasks();
        expect(tasks.map((task) => [task.externalId, task.parentExternalId, task.statusExternalId])).toEqual([
            ['10', null, '1'],
            ['11', '10', null],
            ['13', '11', null],
        ]);
    });

    it('keeps sub-tasks in the list of their parent story', () => {
        const subtask = issue('13', { parent: { id: '11' }, issuetype: { subtask: true, hierarchyLevel: -1 } });
        const tasks = mapper(snapshot([epic('10'), issue('11', { parent: { id: '10' } }), subtask])).tasks();
        expect(tasks.find((task) => task.externalId === '13')).toMatchObject({ parentExternalId: '11', listExternalId: '10' });
    });

    it('maps done category, priority, due date, labels, assignee and source URL', () => {
        const [task] = mapper(
            snapshot([
                issue('1', {
                    status: done,
                    priority: { name: 'Highest' },
                    duedate: '2026-11-15',
                    labels: ['backend', 'backend', 'api'],
                    assignee: { accountId: 'acc-1', displayName: 'Alice' },
                    resolutiondate: '2026-10-02T08:00:00.000+0000',
                }),
            ]),
        ).tasks();
        expect(task).toMatchObject({
            statusExternalId: '10001',
            complete: true,
            completedAt: new Date('2026-10-02T08:00:00Z'),
            priority: 3,
            endDate: '2026-11-15',
            tagExternalIds: ['backend', 'api'],
            assigneeExternalIds: ['acc-1'],
            sourceUrl: 'https://acme.atlassian.net/browse/PRJ-1',
        });
        expect(mapper(snapshot([issue('1', { priority: { name: 'Urgent-ish' } })])).tasks()[0].priority).toBeNull();
    });

    it('builds the note from the ADF description and comments', () => {
        const body = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Looks good' }] }] };
        const comments = new Map([['1', [{ id: 'c1', author: { accountId: 'a', displayName: 'Bob' }, body, created: '2026-10-01T10:00:00.000+0000' }]]]);
        const description = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Details' }] }] };
        const [task] = mapper(snapshot([issue('1', { description })], comments)).tasks();
        expect(task.noteMarkdown).toBe('Details\n\n**Comments**\n\n> **Bob**, 2026-10-01 10:00 UTC\n>\n> Looks good');
        expect(mapper(snapshot([issue('1', { description })], comments), { commentsToNote: false }).tasks()[0].noteMarkdown).toBe('Details');
    });

    it('maps attachments to download references by id', () => {
        const attachment = [{ id: '555', filename: 'spec.pdf', mimeType: 'application/pdf', size: 42 }, { id: '../x', filename: 'bad' }];
        const [task] = mapper(snapshot([issue('1', { attachment })])).tasks();
        expect(task.attachments).toEqual([
            { externalId: '555', name: 'spec.pdf', mimeType: 'application/pdf', sizeBytes: 42, downloadRef: JSON.stringify({ id: '555' }) },
        ]);
        expect(mapper(snapshot([issue('1', { attachment })]), { includeAttachments: false }).tasks()[0].attachments).toEqual([]);
    });

    it('creates gray tags only for used labels', () => {
        expect(mapper(snapshot([issue('1', { labels: ['ui'] })])).structure().tags).toEqual([{ externalId: 'ui', name: 'ui', color: '#808080' }]);
    });
});
