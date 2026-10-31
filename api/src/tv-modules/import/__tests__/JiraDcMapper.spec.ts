import { describe, expect, it } from 'vitest';
import { JiraDcMapper } from '../providers/jira-dc/JiraDcMapper';
import type { JiraDcIssue, JiraDcIssueFields, JiraDcOptions, JiraDcProjectSnapshot } from '../providers/jira-dc/jira-dc.types';

const defaultOptions: JiraDcOptions = {
    epicsAs: 'list',
    includeDone: true,
    commentsToNote: true,
    includeAttachments: true,
};

const todo = { id: '1', name: 'Open', statusCategory: { key: 'new' } };
const done = { id: '6', name: 'Closed', statusCategory: { key: 'done' } };

function issue(id: string, fields: Partial<JiraDcIssueFields> = {}): JiraDcIssue {
    return { id, key: `OPS-${id}`, fields: { summary: `Issue ${id}`, status: todo, issuetype: { name: 'Task' }, ...fields } };
}

function snapshot(issues: JiraDcIssue[], comments: JiraDcProjectSnapshot['commentsByIssue'] = new Map()): JiraDcProjectSnapshot {
    return {
        project: { id: '200', key: 'OPS', name: 'Operations' },
        statuses: [done, todo],
        issues,
        epicFields: { epicLink: 'customfield_10100', epicName: 'customfield_10101' },
        commentsByIssue: comments,
    };
}

function mapper(data: JiraDcProjectSnapshot, options: Partial<JiraDcOptions> = {}) {
    return new JiraDcMapper({ snapshot: data, siteUrl: 'https://jira.acme.io/jira', options: { ...defaultOptions, ...options }, locale: 'en' });
}

describe('JiraDcMapper', () => {
    it('finds epics through the Epic Link field and names lists by Epic Name', () => {
        const data = snapshot([
            issue('10', { summary: 'Payments epic', customfield_10101: 'Payments' }),
            issue('11', { customfield_10100: 'OPS-10' }),
            issue('12'),
        ]);
        const result = mapper(data);
        expect(result.structure().lists).toEqual([{ externalId: '10', name: 'Payments' }]);
        expect(result.tasks().map((task) => [task.externalId, task.parentExternalId, task.listExternalId])).toEqual([
            ['10', null, '10'],
            ['11', null, '10'],
            ['12', null, null],
        ]);
    });

    it('nests epic issues and sub-tasks when epics become tasks', () => {
        const tasks = mapper(
            snapshot([
                issue('10', { customfield_10101: 'Payments' }),
                issue('11', { customfield_10100: 'OPS-10' }),
                issue('12', { parent: { id: '11' }, issuetype: { name: 'Sub-task', subtask: true } }),
            ]),
            { epicsAs: 'task' },
        ).tasks();
        expect(tasks.map((task) => [task.externalId, task.parentExternalId, task.statusExternalId])).toEqual([
            ['10', null, '1'],
            ['11', '10', null],
            ['12', '11', null],
        ]);
    });

    it('works without Jira Software epic fields', () => {
        const data = { ...snapshot([issue('1', { customfield_10100: 'OPS-2' }), issue('2')]), epicFields: { epicLink: null, epicName: null } };
        const result = mapper(data);
        expect(result.structure().lists).toEqual([]);
        expect(result.tasks().every((task) => task.listExternalId === null)).toBe(true);
    });

    it('maps status, legacy priorities, assignee key, wiki notes and attachments', () => {
        const comments = new Map([['1', [{ id: 'c1', author: { name: 'bob', displayName: 'Bob' }, body: '*ok*', created: '2026-10-01T13:00:00.000+0300' }]]]);
        const [task] = mapper(
            snapshot(
                [
                    issue('1', {
                        status: done,
                        priority: { name: 'Blocker' },
                        assignee: { key: 'JIRAUSER10000', name: 'alice' },
                        description: 'h3. Steps',
                        resolutiondate: '2026-10-02T11:00:00.000+0300',
                        attachment: [{ id: '77', filename: 'log.txt', mimeType: 'text/plain', size: 5 }],
                    }),
                ],
                comments,
            ),
        ).tasks();
        expect(task).toMatchObject({
            statusExternalId: '6',
            complete: true,
            completedAt: new Date('2026-10-02T08:00:00Z'),
            priority: 3,
            assigneeExternalIds: ['JIRAUSER10000'],
            sourceUrl: 'https://jira.acme.io/jira/browse/OPS-1',
            noteMarkdown: '### Steps\n\n**Comments**\n\n> **Bob**, 2026-10-01 10:00 UTC\n>\n> **ok**',
        });
        expect(task.attachments[0].downloadRef).toBe(JSON.stringify({ id: '77', filename: 'log.txt' }));
        expect(mapper(snapshot([issue('1', { priority: { name: 'Trivial' } })])).tasks()[0].priority).toBe(1);
    });
});
