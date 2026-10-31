import { describe, expect, it } from 'vitest';
import { TodoistMapper } from '../providers/todoist/TodoistMapper';
import type { TodoistComment, TodoistOptions, TodoistProjectSnapshot, TodoistTask } from '../providers/todoist/todoist.types';

const defaultOptions: TodoistOptions = {
    sectionsAs: 'status',
    includeCompleted: true,
    commentsToNote: true,
    includeAttachments: true,
};

function task(overrides: Partial<TodoistTask> & { id: string }): TodoistTask {
    return {
        content: `Task ${overrides.id}`,
        description: null,
        section_id: null,
        parent_id: null,
        child_order: 1,
        labels: [],
        priority: 1,
        responsible_uid: null,
        checked: false,
        completed_at: null,
        due: null,
        ...overrides,
    };
}

function comment(overrides: Partial<TodoistComment> & { id: string }): TodoistComment {
    return {
        content: null,
        posted_uid: 'u1',
        posted_at: '2026-10-01T10:00:00Z',
        file_attachment: null,
        ...overrides,
    };
}

function snapshot(tasks: TodoistTask[], comments: TodoistProjectSnapshot['commentsByTask'] = new Map()): TodoistProjectSnapshot {
    return {
        project: { id: 'p1', name: '  Home   chores ', description: 'Project description' },
        sections: [
            { id: 's-done', name: 'Done', section_order: 2 },
            { id: 's-todo', name: 'To do', section_order: 1 },
            { id: 's-old', name: 'Old', section_order: 3, is_archived: true },
        ],
        tasks,
        labels: [{ id: 'l1', name: 'urgent', color: 'berry_red' }],
        people: [{ id: 'u1', name: 'Alice', email: 'alice@example.com' }],
        commentsByTask: comments,
    };
}

function mapper(data: TodoistProjectSnapshot, options: Partial<TodoistOptions> = {}) {
    return new TodoistMapper({ snapshot: data, options: { ...defaultOptions, ...options }, locale: 'en' });
}

describe('TodoistMapper', () => {
    it('maps active sections to statuses in order and leaves unsectioned tasks in the backlog', () => {
        const result = mapper(snapshot([task({ id: 't1', section_id: 's-todo' }), task({ id: 't2' })]));
        const structure = result.structure();
        expect(structure.projectName).toBe('Home chores');
        expect(structure.statuses).toEqual([
            { externalId: 's-todo', name: 'To do' },
            { externalId: 's-done', name: 'Done' },
        ]);
        expect(structure.lists).toEqual([]);
        expect(result.tasks().map((item) => [item.externalId, item.statusExternalId])).toEqual([
            ['t2', null],
            ['t1', 's-todo'],
        ]);
    });

    it('keeps default statuses when the project has no sections', () => {
        const data = { ...snapshot([task({ id: 't1' })]), sections: [] };
        const result = mapper(data);
        expect(result.structure().statuses).toEqual([]);
        expect(result.tasks()[0].statusExternalId).toBeNull();
    });

    it('maps sections to lists when asked', () => {
        const result = mapper(snapshot([task({ id: 't1', section_id: 's-done' })]), { sectionsAs: 'list' });
        expect(result.structure().statuses).toEqual([]);
        expect(result.structure().lists.map((list) => list.externalId)).toEqual(['s-todo', 's-done']);
        expect(result.tasks()[0]).toMatchObject({ statusExternalId: null, listExternalId: 's-done' });
    });

    it('orders parents before children and keeps orphans at the top level', () => {
        const tasks = mapper(
            snapshot([
                task({ id: 'child', parent_id: 'parent', child_order: 1 }),
                task({ id: 'orphan', parent_id: 'missing', child_order: 3 }),
                task({ id: 'parent', child_order: 2 }),
            ]),
        ).tasks();
        expect(tasks.map((item) => [item.externalId, item.parentExternalId])).toEqual([
            ['parent', null],
            ['child', 'parent'],
            ['orphan', null],
        ]);
        expect(tasks[1].statusExternalId).toBeNull();
    });

    it('maps priority, due date, labels, assignee, completion and source URL', () => {
        const [mapped] = mapper(
            snapshot([
                task({
                    id: 'abc',
                    priority: 4,
                    due: { date: '2026-11-15T09:30:00', string: 'every monday', is_recurring: true },
                    labels: ['urgent', 'urgent', 'shared'],
                    responsible_uid: 'u1',
                    checked: true,
                    completed_at: '2026-10-02T08:00:00Z',
                }),
            ]),
        ).tasks();
        expect(mapped).toMatchObject({
            priority: 3,
            startDate: null,
            endDate: '2026-11-15',
            tagExternalIds: ['urgent', 'shared'],
            assigneeExternalIds: ['u1'],
            complete: true,
            completedAt: new Date('2026-10-02T08:00:00Z'),
            sourceUrl: 'https://app.todoist.com/app/task/abc',
        });
        expect(mapped.noteMarkdown).toContain('**Repeats:** every monday');
    });

    it('treats priority 1 as no priority', () => {
        expect(mapper(snapshot([task({ id: 't1', priority: 1 })])).tasks()[0].priority).toBeNull();
        expect(mapper(snapshot([task({ id: 't1', priority: 2 })])).tasks()[0].priority).toBe(1);
    });

    it('creates tags only for used labels with Todoist colors', () => {
        const structure = mapper(snapshot([task({ id: 't1', labels: ['urgent', 'shared'] })])).structure();
        expect(structure.tags).toEqual([
            { externalId: 'urgent', name: 'urgent', color: '#B8255F' },
            { externalId: 'shared', name: 'shared', color: '#808080' },
        ]);
    });

    it('turns Todoist uploads into attachments and other files into note links', () => {
        const comments = new Map([
            [
                't1',
                [
                    comment({
                        id: 'c1',
                        content: 'See file',
                        file_attachment: { file_name: 'a.pdf', file_type: 'application/pdf', file_size: 10, file_url: 'https://files.todoist.com/x/a.pdf' },
                    }),
                    comment({ id: 'c2', file_attachment: { file_name: 'Doc (v2)', file_url: 'https://example.com/doc (v2)' } }),
                    comment({ id: 'c3', file_attachment: { file_name: 'evil', file_url: 'javascript:alert(1)' } }),
                ],
            ],
        ]);
        const [mapped] = mapper(snapshot([task({ id: 't1' })], comments)).tasks();
        expect(mapped.attachments).toEqual([
            {
                externalId: 'c1',
                name: 'a.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 10,
                downloadRef: JSON.stringify({ url: 'https://files.todoist.com/x/a.pdf' }),
            },
        ]);
        expect(mapped.noteMarkdown).toContain('- [Doc (v2)](https://example.com/doc%20%28v2%29)');
        expect(mapped.noteMarkdown).not.toContain('javascript:');
        expect(mapped.noteMarkdown).toContain('> **Alice**, 2026-10-01 10:00 UTC');
        expect(mapped.noteMarkdown).toContain('> See file');
    });

    it('skips comments and attachments when disabled', () => {
        const comments = new Map([
            ['t1', [comment({ id: 'c1', content: 'Hi', file_attachment: { file_name: 'a.pdf', file_url: 'https://files.todoist.com/a.pdf' } })]],
        ]);
        const [mapped] = mapper(snapshot([task({ id: 't1' })], comments), { commentsToNote: false, includeAttachments: false }).tasks();
        expect(mapped.attachments).toEqual([]);
        expect(mapped.noteMarkdown).toBeNull();
    });
});
