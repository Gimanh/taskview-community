import axios, { type AxiosInstance } from 'axios';
import fs from 'fs/promises';
import http from 'http';
import { join } from 'path';
import { Readable } from 'stream';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
    FileToTaskSchema,
    GoalsSchema,
    ImportJobsSchema,
    TagsSchema,
    TasksAssigneeSchema,
    TasksSchema,
    TasksStatusesSchema,
    TasksToTagsSchema,
} from 'taskview-db-schemas';
import App from '../../../App';
import { Database } from '../../../modules/db';
import { encrypt } from '../../../utils/crypto';
import type { ImportProvider } from '../core/ImportProvider';
import { ImportProviderError } from '../core/ImportProviderError';
import { ImportProviderRegistry } from '../core/ImportProviderRegistry';
import type { ImportReader, ImportStructure, ImportTask } from '../core/import-provider.types';
import { ImportApplier } from '../ImportApplier';
import { ImportRepository } from '../ImportRepository';
import type { ImportJobStats } from '../types';

vi.mock('emailjs', () => ({
    SMTPClient: vi.fn().mockImplementation(() => ({ sendAsync: vi.fn().mockResolvedValue(true) })),
}));

const port = 1826;
const IMPORT_MIGRATION_DIR = join(__dirname, '../../../migrations/taskview/sql/1.74.0');
const FILES_MIGRATION_DIR = join(__dirname, '../../../migrations/taskview/sql/1.67.0');

const api: AxiosInstance = axios.create({
    baseURL: `http://localhost:${port}`,
    validateStatus: () => true,
    httpAgent: new http.Agent({ keepAlive: false }),
});

let server: http.Server;
let jwt = '';
let userId = 0;
let organizationId = 0;
let ownerMemberId = 0;
const createdGoalIds: number[] = [];
const createdJobIds: number[] = [];
const auth = () => ({ headers: { Authorization: `Bearer ${jwt}` } });
const db = () => Database.getInstance().dbDrizzle;
const repository = new ImportRepository();

const structure: ImportStructure = {
    projectName: `import-smoke-${Date.now()}`,
    projectDescription: 'Imported board',
    statuses: [
        { externalId: 's-backlog', name: 'Backlog' },
        { externalId: 's-doing', name: 'Doing' },
    ],
    lists: [],
    tags: [{ externalId: 't-bug', name: 'Bug', color: '#F87168' }],
    taskCount: 4,
};

function task(overrides: Partial<ImportTask> & { externalId: string }): ImportTask {
    return {
        parentExternalId: null,
        title: overrides.externalId,
        noteMarkdown: null,
        sourceUrl: null,
        statusExternalId: null,
        listExternalId: null,
        tagExternalIds: [],
        assigneeExternalIds: [],
        startDate: null,
        endDate: null,
        priority: null,
        complete: false,
        completedAt: null,
        attachments: [],
        ...overrides,
    };
}

const tasks: ImportTask[][] = [
    [
        task({
            externalId: 'card-1',
            title: 'First card',
            noteMarkdown: '**Bold** description',
            sourceUrl: 'https://trello.com/c/card1',
            statusExternalId: 's-backlog',
            tagExternalIds: ['t-bug', 'unknown-tag'],
            assigneeExternalIds: ['person-owner', 'person-unmapped'],
            endDate: '2026-11-15',
            attachments: [{ externalId: 'att-1', name: 'notes.txt', mimeType: 'text/plain', sizeBytes: 5, downloadRef: 'att-1' }],
        }),
        task({ externalId: 'card-2', title: 'Second card', statusExternalId: 's-backlog', complete: true, completedAt: new Date('2026-10-01T10:00:00Z') }),
    ],
    [
        task({ externalId: 'item-1', title: 'Subtask', parentExternalId: 'card-1' }),
        task({ externalId: 'card-3', title: 'Third card', statusExternalId: 's-doing' }),
    ],
];

type StubBehaviour = { failAfterFirstBatch?: boolean; onSecondBatch?: () => Promise<void>; taskCount?: number };

function stubProvider(behaviour: StubBehaviour = {}): ImportProvider {
    const reader: ImportReader = {
        readStructure: async () => ({ ...structure, taskCount: behaviour.taskCount ?? structure.taskCount }),
        readTasks: async function* () {
            yield tasks[0];
            if (behaviour.failAfterFirstBatch) throw new ImportProviderError('unavailable', 'source went away');
            await behaviour.onSecondBatch?.();
            yield tasks[1];
        },
        downloadAttachment: async () => ({ stream: Readable.from(Buffer.from('hello')), mimeType: 'text/plain' }),
    };
    return {
        id: 'stub',
        options: [],
        auth: () => ({ popupAuthorizeUrl: null, popupCredentialKey: null, manualFields: [] }),
        sanitizeOptions: (options) => ({ ok: true, options: options as Record<string, string | boolean> }),
        defaultOptions: () => ({}),
        validateCredentials: async () => ({ ok: true, accountName: 'stub' }),
        listRemoteProjects: async () => [],
        fetchProjectMeta: async () => {
            throw new Error('not used');
        },
        createReader: () => reader,
    };
}

async function queuedJob(): Promise<number> {
    const job = await repository.createJob({
        organizationId,
        createdBy: userId,
        provider: 'stub',
        credentialsEncrypted: encrypt(JSON.stringify({ token: 'secret' })),
        accountName: 'stub',
    });
    expect(job).not.toBeNull();
    createdJobIds.push(job!.id);
    const queued = await repository.queueJob({
        id: job!.id,
        externalProjectId: 'board-1',
        externalProjectName: 'Board',
        config: {
            peopleMapping: [{ externalId: 'person-owner', organizationMemberId: ownerMemberId }],
            options: {},
            locale: 'en',
        },
    });
    expect(queued?.status).toBe('pending');
    return job!.id;
}

async function runWith(behaviour: StubBehaviour = {}) {
    vi.spyOn(ImportProviderRegistry, 'get').mockReturnValue(stubProvider(behaviour));
    const jobId = await queuedJob();
    await new ImportApplier().run(jobId);
    const job = await repository.fetchJob(jobId);
    if (job?.goalId) createdGoalIds.push(job.goalId);
    return job!;
}

async function applyMigration(dir: string) {
    const client = await Database.getInstance().getClient();
    await client.query('SELECT pg_advisory_lock(1401067)');
    try {
        for (const file of (await fs.readdir(dir)).sort()) {
            await client.query(await fs.readFile(join(dir, file), 'utf-8'));
        }
    } finally {
        await client.query('SELECT pg_advisory_unlock(1401067)');
        client.release();
    }
}

describe('Import', () => {
    beforeAll(async () => {
        await applyMigration(FILES_MIGRATION_DIR);
        await applyMigration(IMPORT_MIGRATION_DIR);
        server = new App(port).listen();

        const login = await api.post('/module/auth/login', { login: 'test@mail.dest', password: 'user1!#Q' });
        expect(login.status).toBe(200);
        jwt = login.data.access;

        const orgs = await api.get('/module/organizations', auth());
        expect(orgs.status).toBe(200);
        const owned = orgs.data.response.find((org: { currentUserRole: string }) => org.currentUserRole === 'owner');
        organizationId = owned.id;
        userId = owned.ownerId;

        const members = await api.get(`/module/organizations/${organizationId}/members`, auth());
        expect(members.status).toBe(200);
        ownerMemberId = members.data.response.find((member: { role: string }) => member.role === 'owner').id;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    afterAll(async () => {
        if (createdGoalIds.length > 0) await db().delete(GoalsSchema).where(inArray(GoalsSchema.id, createdGoalIds));
        if (createdJobIds.length > 0) await db().delete(ImportJobsSchema).where(inArray(ImportJobsSchema.id, createdJobIds));
        if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    }, 30_000);

    describe('HTTP', () => {
        it('lists providers with their options', async () => {
            const response = await api.get('/module/import/providers', auth());
            expect(response.status).toBe(200);
            const trello = response.data.response.find((provider: { id: string }) => provider.id === 'trello');
            expect(trello.options.map((option: { key: string }) => option.key)).toEqual([
                'listAs',
                'checklistsAs',
                'includeArchived',
                'commentsToNote',
                'includeAttachments',
            ]);
        });

        it('rejects unauthenticated requests', async () => {
            expect((await api.get('/module/import/providers')).status).toBe(401);
        });

        it('rejects an unknown provider and malformed credentials without creating a job', async () => {
            const unknown = await api.post('/module/import/jobs', { organizationId, provider: 'nope', credentials: {} }, auth());
            expect(unknown.status).toBe(400);
            expect(unknown.data.response.code).toBe('unknown_provider');

            const malformed = await api.post(
                '/module/import/jobs',
                { organizationId, provider: 'trello', credentials: { apiKey: 'short', token: 'bad"\r\n' } },
                auth(),
            );
            expect(malformed.status).toBe(400);
            expect(malformed.data.response.code).toBe('invalid_credentials');
        });

        it('forbids importing into an organization the user does not administer', async () => {
            const response = await api.post('/module/import/jobs', { organizationId: 2_000_000_000, provider: 'trello', credentials: {} }, auth());
            expect(response.status).toBe(403);
        });

        it('hides jobs of other users and never returns credentials', async () => {
            const job = await repository.createJob({
                organizationId,
                createdBy: userId,
                provider: 'trello',
                credentialsEncrypted: encrypt('{}'),
                accountName: 'me',
            });
            createdJobIds.push(job!.id);
            const own = await api.get(`/module/import/jobs/${job!.id}`, auth());
            expect(own.status).toBe(200);
            expect(JSON.stringify(own.data.response)).not.toContain('credentials');

            expect((await api.get('/module/import/jobs/2000000000', auth())).status).toBe(404);

            const cancelled = await api.post(`/module/import/jobs/${job!.id}/cancel`, {}, auth());
            expect(cancelled.status).toBe(200);
            expect(cancelled.data.response.status).toBe('cancelled');
            expect((await repository.fetchJob(job!.id))?.credentialsEncrypted).toBeNull();
        });
    });

    describe('limits', () => {
        it('refuses to start a second import while one is active', async () => {
            vi.spyOn(ImportProviderRegistry, 'get').mockReturnValue(stubProvider());
            const active = await queuedJob();
            const draft = await repository.createJob({
                organizationId,
                createdBy: userId,
                provider: 'stub',
                credentialsEncrypted: encrypt('{}'),
                accountName: 'stub',
            });
            createdJobIds.push(draft!.id);

            const response = await api.post(
                `/module/import/jobs/${draft!.id}/start`,
                { externalProjectId: 'board-1', peopleMapping: [], options: {}, locale: 'en' },
                auth(),
            );
            expect(response.status).toBe(409);
            expect(response.data.response.code).toBe('already_running');

            const second = await repository.queueJob({
                id: draft!.id,
                externalProjectId: 'board-1',
                externalProjectName: 'Board',
                config: { peopleMapping: [], options: {}, locale: 'en' },
            });
            expect(second).toBeNull();
            await repository.cancelJob(active);
        });

        it('fails an oversized import before creating the project', async () => {
            const job = await runWith({ taskCount: 50_001 });
            expect(job.status).toBe('failed');
            expect(job.error).toBe('too_large');
            expect(job.goalId).toBeNull();
        });
    });

    describe('ImportApplier', () => {
        it('creates the project with structure, tasks, hierarchy, tags, assignees and files', async () => {
            const job = await runWith();
            expect(job.status).toBe('completed');
            expect(job.credentialsEncrypted).toBeNull();
            expect(job.goalId).not.toBeNull();
            const goalId = job.goalId!;

            const [goal] = await db().select().from(GoalsSchema).where(eq(GoalsSchema.id, goalId));
            expect(goal).toMatchObject({ name: structure.projectName, description: 'Imported board', organizationId });

            const statuses = await db().select().from(TasksStatusesSchema).where(eq(TasksStatusesSchema.goalId, goalId)).orderBy(asc(TasksStatusesSchema.viewOrder));
            expect(statuses.map((status) => status.name)).toEqual(['Backlog', 'Doing']);

            const rows = await db().select().from(TasksSchema).where(eq(TasksSchema.goalId, goalId)).orderBy(asc(TasksSchema.id));
            const byTitle = new Map(rows.map((row) => [row.description, row]));
            expect(rows).toHaveLength(4);

            const first = byTitle.get('First card')!;
            expect(first).toMatchObject({
                note: '**Bold** description',
                sourceUrl: 'https://trello.com/c/card1',
                statusId: statuses[0].id,
                endDate: '2026-11-15',
                complete: false,
                parentId: null,
            });
            expect(byTitle.get('Subtask')).toMatchObject({ parentId: first.id, statusId: null });
            expect(byTitle.get('Second card')).toMatchObject({ complete: true, statusId: statuses[0].id });
            expect(byTitle.get('Second card')!.dateComplete).toEqual(new Date('2026-10-01T10:00:00Z'));
            expect(byTitle.get('Third card')!.statusId).toBe(statuses[1].id);
            expect(first.kanbanOrder!).toBeLessThan(byTitle.get('Second card')!.kanbanOrder!);

            const tagLinks = await db()
                .select({ name: TagsSchema.name })
                .from(TasksToTagsSchema)
                .innerJoin(TagsSchema, eq(TasksToTagsSchema.tagId, TagsSchema.id))
                .where(eq(TasksToTagsSchema.taskId, first.id));
            expect(tagLinks).toEqual([{ name: 'Bug' }]);

            const assignees = await db().select().from(TasksAssigneeSchema).where(eq(TasksAssigneeSchema.taskId, first.id));
            expect(assignees).toHaveLength(1);

            const files = await db().select().from(FileToTaskSchema).where(eq(FileToTaskSchema.taskId, first.id));
            expect(files).toHaveLength(1);

            const stats = job.stats as ImportJobStats;
            expect(stats).toMatchObject({
                tasksCreated: 4,
                statusesCreated: 2,
                tagsCreated: 1,
                assigneesLinked: 1,
                attachmentsUploaded: 1,
                attachmentsSkipped: 0,
            });
            expect(stats.warnings).toEqual([]);
        });

        it('deletes the half-built project when the source fails before all tasks are written', async () => {
            const job = await runWith({ failAfterFirstBatch: true });
            expect(job.status).toBe('failed');
            expect(job.error).toBe('unavailable');
            expect(job.goalId).toBeNull();
            expect(job.credentialsEncrypted).toBeNull();

            const leftovers = await db().select().from(GoalsSchema).where(and(eq(GoalsSchema.name, structure.projectName), eq(GoalsSchema.organizationId, organizationId)));
            expect(leftovers.map((goal) => goal.id).every((id) => createdGoalIds.includes(id))).toBe(true);
        });

        it('stops and removes the project when cancelled during the task phase', async () => {
            let jobId = 0;
            const job = await (async () => {
                vi.spyOn(ImportProviderRegistry, 'get').mockReturnValue(
                    stubProvider({ onSecondBatch: async () => void (await repository.cancelJob(jobId)) }),
                );
                jobId = await queuedJob();
                await new ImportApplier().run(jobId);
                return (await repository.fetchJob(jobId))!;
            })();

            expect(job.status).toBe('cancelled');
            expect(job.goalId).toBeNull();
        });

        it('does not run a job that is not pending', async () => {
            vi.spyOn(ImportProviderRegistry, 'get').mockReturnValue(stubProvider());
            const jobId = await queuedJob();
            await repository.cancelJob(jobId);
            await new ImportApplier().run(jobId);
            const job = await repository.fetchJob(jobId);
            expect(job?.status).toBe('cancelled');
            expect(job?.goalId).toBeNull();
        });
    });
});
