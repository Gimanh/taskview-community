import { describe, expect, it } from 'vitest';
import { TrelloMapper } from '../providers/trello/TrelloMapper';
import type { TrelloBoardSnapshot, TrelloCard, TrelloOptions } from '../providers/trello/trello.types';

const LIST_TODO = '5f0000000000000000000001';
const LIST_DONE = '5f0000000000000000000002';
const LIST_ARCHIVED = '5f0000000000000000000003';
const LABEL_BUG = '5f00000000000000000000a1';
const LABEL_COLOR_ONLY = '5f00000000000000000000a2';
const MEMBER = '5f00000000000000000000b1';

const defaultOptions: TrelloOptions = {
    listAs: 'status',
    checklistsAs: 'subtasks',
    includeArchived: false,
    commentsToNote: true,
    includeAttachments: true,
};

function card(overrides: Partial<TrelloCard> & { id: string }): TrelloCard {
    return {
        name: `Card ${overrides.id}`,
        desc: null,
        closed: false,
        idList: LIST_TODO,
        idLabels: [],
        idMembers: [],
        pos: 1,
        start: null,
        due: null,
        dueComplete: false,
        url: `https://trello.com/c/${overrides.id}`,
        dateLastActivity: '2026-10-01T10:00:00.000Z',
        attachments: [],
        checklists: [],
        ...overrides,
    };
}

function snapshot(cards: TrelloCard[], comments: TrelloBoardSnapshot['commentsByCard'] = new Map()): TrelloBoardSnapshot {
    return {
        board: { id: 'board', name: '  Product   board ', desc: 'Board description', url: 'https://trello.com/b/x' },
        lists: [
            { id: LIST_DONE, name: 'Done', closed: false, pos: 200 },
            { id: LIST_TODO, name: 'To do', closed: false, pos: 100 },
            { id: LIST_ARCHIVED, name: 'Old', closed: true, pos: 300 },
        ],
        labels: [
            { id: LABEL_BUG, name: 'Bug', color: 'red' },
            { id: LABEL_COLOR_ONLY, name: '', color: 'sky_dark' },
        ],
        cards,
        commentsByCard: comments,
    };
}

function mapper(data: TrelloBoardSnapshot, options: Partial<TrelloOptions> = {}) {
    return new TrelloMapper({ snapshot: data, options: { ...defaultOptions, ...options }, locale: 'en' });
}

describe('TrelloMapper', () => {
    it('maps open lists to statuses in board order and labels to colored tags', () => {
        const structure = mapper(snapshot([card({ id: 'c1' })])).structure();

        expect(structure.projectName).toBe('Product board');
        expect(structure.statuses.map((status) => status.name)).toEqual(['To do', 'Done']);
        expect(structure.lists).toEqual([]);
        expect(structure.tags).toEqual([
            { externalId: LABEL_BUG, name: 'Bug', color: '#F87168' },
            { externalId: LABEL_COLOR_ONLY, name: 'sky dark', color: '#227D9B' },
        ]);
        expect(structure.taskCount).toBe(1);
    });

    it('maps lists to TaskView lists when listAs is list', () => {
        const mapped = mapper(snapshot([card({ id: 'c1' })]), { listAs: 'list' });

        expect(mapped.structure().statuses).toEqual([]);
        expect(mapped.structure().lists.map((list) => list.name)).toEqual(['To do', 'Done']);
        expect(mapped.tasks()[0]).toMatchObject({ statusExternalId: null, listExternalId: LIST_TODO });
    });

    it('orders cards by list position, then card position', () => {
        const tasks = mapper(
            snapshot([
                card({ id: 'done', idList: LIST_DONE, pos: 1 }),
                card({ id: 'todo-2', pos: 20 }),
                card({ id: 'todo-1', pos: 10 }),
            ]),
        ).tasks();

        expect(tasks.map((task) => task.externalId)).toEqual(['todo-1', 'todo-2', 'done']);
    });

    it('skips archived cards and cards of archived lists unless includeArchived is set', () => {
        const cards = [
            card({ id: 'open' }),
            card({ id: 'archived', closed: true }),
            card({ id: 'in-archived-list', idList: LIST_ARCHIVED }),
        ];

        expect(mapper(snapshot(cards)).tasks().map((task) => task.externalId)).toEqual(['open']);

        const withArchived = mapper(snapshot(cards), { includeArchived: true }).tasks();
        expect(withArchived.map((task) => task.externalId).sort()).toEqual(['archived', 'in-archived-list', 'open']);
        expect(withArchived.find((task) => task.externalId === 'archived')).toMatchObject({ complete: true });
    });

    it('maps card fields, dates and completion', () => {
        const [task] = mapper(
            snapshot([
                card({
                    id: 'c1',
                    idLabels: [LABEL_BUG],
                    idMembers: [MEMBER],
                    start: '2026-10-05T00:00:00.000Z',
                    due: '2026-10-20T09:00:00.000Z',
                    dueComplete: true,
                }),
            ]),
        ).tasks();

        expect(task).toMatchObject({
            parentExternalId: null,
            title: 'Card c1',
            sourceUrl: 'https://trello.com/c/c1',
            statusExternalId: LIST_TODO,
            tagExternalIds: [LABEL_BUG],
            assigneeExternalIds: [MEMBER],
            startDate: '2026-10-05',
            endDate: '2026-10-20',
            complete: true,
        });
        expect(task.completedAt).toEqual(new Date('2026-10-01T10:00:00.000Z'));
    });

    it('turns checklist items into subtasks placed right after their card', () => {
        const tasks = mapper(
            snapshot([
                card({
                    id: 'parent',
                    checklists: [
                        {
                            id: 'cl2',
                            name: 'Release',
                            pos: 2,
                            checkItems: [{ id: 'i3', name: 'Ship', state: 'incomplete', pos: 1, due: null, idMember: null }],
                        },
                        {
                            id: 'cl1',
                            name: 'Build',
                            pos: 1,
                            checkItems: [
                                { id: 'i2', name: 'Test', state: 'incomplete', pos: 2, due: null, idMember: null },
                                { id: 'i1', name: 'Code', state: 'complete', pos: 1, due: '2026-11-01T12:00:00.000Z', idMember: MEMBER },
                            ],
                        },
                    ],
                }),
            ]),
        ).tasks();

        expect(tasks.map((task) => task.title)).toEqual(['Card parent', 'Build: Code', 'Build: Test', 'Release: Ship']);
        expect(tasks[1]).toMatchObject({
            parentExternalId: 'parent',
            statusExternalId: null,
            complete: true,
            endDate: '2026-11-01',
            assigneeExternalIds: [MEMBER],
        });
    });

    it('writes checklists into the note as task lists when checklistsAs is note', () => {
        const tasks = mapper(
            snapshot([
                card({
                    id: 'c1',
                    desc: 'Body',
                    checklists: [
                        {
                            id: 'cl1',
                            name: 'Steps',
                            pos: 1,
                            checkItems: [
                                { id: 'i1', name: 'First', state: 'complete', pos: 1, due: null, idMember: null },
                                { id: 'i2', name: 'Second [draft]', state: 'incomplete', pos: 2, due: null, idMember: null },
                            ],
                        },
                    ],
                }),
            ]),
            { checklistsAs: 'note' },
        ).tasks();

        expect(tasks).toHaveLength(1);
        expect(tasks[0].noteMarkdown).toBe('Body\n\n**Steps**\n- [x] First\n- [ ] Second \\[draft\\]');
    });

    it('appends link attachments and comments to the note and keeps uploads as files', () => {
        const comments = new Map([
            ['c1', [{ authorName: 'Alex', date: '2026-10-02T08:30:00.000Z', text: 'Line one\nLine two' }]],
        ]);
        const [task] = mapper(
            snapshot(
                [
                    card({
                        id: 'c1',
                        attachments: [
                            { id: 'a1', name: 'Spec (v2)', fileName: null, url: 'https://example.com/spec (v2)', bytes: null, mimeType: null, isUpload: false },
                            { id: 'a2', name: 'evil', fileName: null, url: 'javascript:alert(1)', bytes: null, mimeType: null, isUpload: false },
                            { id: '5f00000000000000000000c1', name: 'photo.png', fileName: 'photo.png', url: 'https://trello.com/1/x', bytes: 2048, mimeType: 'image/png', isUpload: true },
                        ],
                    }),
                ],
                comments,
            ),
        ).tasks();

        expect(task.noteMarkdown).toBe(
            '**Attachments**\n- [Spec (v2)](https://example.com/spec%20%28v2%29)\n\n' +
                '**Comments**\n\n> **Alex**, 2026-10-02 08:30 UTC\n>\n> Line one\n> Line two',
        );
        expect(task.attachments).toEqual([
            {
                externalId: '5f00000000000000000000c1',
                name: 'photo.png',
                mimeType: 'image/png',
                sizeBytes: 2048,
                downloadRef: JSON.stringify({ cardId: 'c1', attachmentId: '5f00000000000000000000c1', fileName: 'photo.png' }),
            },
        ]);
    });

    it('drops attachments and comments when their options are off', () => {
        const comments = new Map([['c1', [{ authorName: 'Alex', date: '2026-10-02T08:30:00.000Z', text: 'Hi' }]]]);
        const [task] = mapper(
            snapshot(
                [
                    card({
                        id: 'c1',
                        attachments: [
                            { id: 'a1', name: 'photo.png', fileName: 'photo.png', url: null, bytes: 10, mimeType: 'image/png', isUpload: true },
                        ],
                    }),
                ],
                comments,
            ),
            { includeAttachments: false, commentsToNote: false },
        ).tasks();

        expect(task.noteMarkdown).toBeNull();
        expect(task.attachments).toEqual([]);
    });

    it('accepts only https trello.com card URLs as the task source', () => {
        const [task] = mapper(snapshot([card({ id: 'c1', url: 'javascript:alert(1)' })])).tasks();
        expect(task.sourceUrl).toBeNull();
    });
});
