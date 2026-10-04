import axios, { type AxiosInstance } from 'axios';
import fs from 'fs/promises';
import http from 'http';
import { join } from 'path';
import type { FileStorageProvider } from 'taskview-db-schemas';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import App from '../../../App';
import { Database } from '../../../modules/db';
import { GoalPermissions } from '../../../types/auth.types';
import { FileDownloadTokens } from '../FileDownloadTokens';
import { FilesRepository } from '../FilesRepository';
import { FileStorageFactory } from '../storage/FileStorageFactory';
import { FileStorageMigrator } from '../storage/FileStorageMigrator';
import type { FileDto, FileListPage } from '../types';

vi.mock('emailjs', () => ({
    SMTPClient: vi.fn().mockImplementation(() => ({ sendAsync: vi.fn().mockResolvedValue(true) })),
}));

const port = 1823;
const url = `http://localhost:${port}`;
const MIGRATION_DIR = join(__dirname, '../../../migrations/taskview/sql/1.67.0');
const LOGIN = 'test@mail.dest';
const PASSWORD = 'user1!#Q';

const api: AxiosInstance = axios.create({
    baseURL: url,
    validateStatus: () => true,
    httpAgent: new http.Agent({ keepAlive: false }),
});

let server: http.Server;
let jwt = '';
let goalId = 0;
let otherGoalId = 0;
let taskId = 0;
const createdTokenIds: number[] = [];

const asUser = () => ({ headers: { Authorization: `Bearer ${jwt}` } });

async function upload(args: { goalId: number; taskId?: number; name: string; content: Buffer | string; mime?: string; auth?: { headers: Record<string, string> } }) {
    const form = new FormData();
    const part = typeof args.content === 'string' ? args.content : new Uint8Array(args.content);
    form.append('file', new Blob([part], { type: args.mime ?? 'text/plain' }), args.name);
    const query = args.taskId ? `?taskId=${args.taskId}` : '';
    return api.post<{ response: FileDto }>(`/module/files/goal/${args.goalId}${query}`, form, args.auth ?? asUser());
}

async function issueToken(allowedPermissions: string[]) {
    const response = await api.post('/module/api-tokens', { name: 'files-probe', allowedPermissions, allowedGoalIds: [] }, asUser());
    expect(response.status).toBe(200);
    createdTokenIds.push(response.data.response.item.id);
    return { headers: { Authorization: `Bearer ${response.data.response.token}` } };
}

async function createTask(inGoal: number, description: string): Promise<number> {
    const response = await api.post('/module/tasks', { goalId: inGoal, description }, asUser());
    expect(response.status).toBe(200);
    return response.data.response.id;
}

async function deleteAllFilesOf(inGoal: number) {
    const page = await api.get<{ response: FileListPage }>(`/module/files/goal/${inGoal}?limit=200`, asUser());
    for (const file of page.data.response?.items ?? []) {
        await api.delete(`/module/files/file/${file.id}`, asUser());
    }
}

function useProvider(provider: FileStorageProvider) {
    process.env.FILE_STORAGE_PROVIDER = provider;
    FileStorageFactory.resetInstance();
}

describe('Files module', () => {
    beforeAll(async () => {
        const db = Database.getInstance();
        const client = await db.getClient();
        for (const file of (await fs.readdir(MIGRATION_DIR)).sort()) {
            await client.query(await fs.readFile(join(MIGRATION_DIR, file), 'utf-8'));
        }
        client.release();

        server = new App(port).listen();

        const login = await api.post('/module/auth/login', { login: LOGIN, password: PASSWORD });
        expect(login.status).toBe(200);
        jwt = login.data.access;

        const goal = await api.post('/module/goals', { name: `files-it-${Date.now()}` }, asUser());
        expect(goal.status).toBe(200);
        goalId = goal.data.response.id;
        const other = await api.post('/module/goals', { name: `files-it-other-${Date.now()}` }, asUser());
        expect(other.status).toBe(200);
        otherGoalId = other.data.response.id;

        taskId = await createTask(goalId, 'task with files');
    });

    afterAll(async () => {
        for (const provider of ['local', 's3'] as const) {
            useProvider(provider);
            await deleteAllFilesOf(goalId);
            await deleteAllFilesOf(otherGoalId);
        }
        for (const id of [goalId, otherGoalId]) {
            if (id) await api.delete('/module/goals', { ...asUser(), data: { goalId: id } });
        }
        for (const id of createdTokenIds) {
            await api.delete('/module/api-tokens', { ...asUser(), data: { id } });
        }
        await new Promise<void>((resolve) => server.close(() => resolve()));
    }, 30_000);

    it('reports storage as disabled and refuses uploads and downloads until a provider is configured', async () => {
        useProvider('local');
        const uploaded = await upload({ goalId, name: 'orphan.txt', content: 'orphan' });
        expect(uploaded.status).toBe(200);
        const fileId = uploaded.data.response.id;
        const issued = await api.post(`/module/files/file/${fileId}/download-url`, {}, asUser());
        expect(issued.status).toBe(200);
        const contentUrl: string = issued.data.response.url;

        const saved = { provider: process.env.FILE_STORAGE_PROVIDER, dir: process.env.FILE_STORAGE_LOCAL_DIR };
        delete process.env.FILE_STORAGE_PROVIDER;
        delete process.env.FILE_STORAGE_LOCAL_DIR;
        FileStorageFactory.resetInstance();
        try {
            const status = await api.get('/module/files/status', asUser());
            expect(status.status).toBe(200);
            expect(status.data.response).toEqual({ enabled: false, maxFileSizeBytes: 1024 * 1024 });

            const rejected = await upload({ goalId, name: 'never.txt', content: 'never' });
            expect(rejected.status).toBe(503);
            expect(rejected.data).toContain('not configured');

            const link = await api.post(`/module/files/file/${fileId}/download-url`, {}, asUser());
            expect(link.status).toBe(503);

            const content = await api.get(contentUrl);
            expect(content.status).toBe(503);
            expect(content.data).toContain('not configured');

            const listed = await api.get<{ response: FileListPage }>(`/module/files/goal/${goalId}`, asUser());
            expect(listed.status).toBe(200);
            expect(listed.data.response.items.map((f) => f.id)).toContain(fileId);
        } finally {
            process.env.FILE_STORAGE_PROVIDER = saved.provider;
            process.env.FILE_STORAGE_LOCAL_DIR = saved.dir;
            FileStorageFactory.resetInstance();
        }

        const status = await api.get('/module/files/status', asUser());
        expect(status.data.response.enabled).toBe(true);
        expect((await api.get(contentUrl)).status).toBe(200);
        expect((await api.delete(`/module/files/file/${fileId}`, asUser())).status).toBe(200);
    });

    it('seeds the files permission group with localized descriptions', async () => {
        const result = await Database.getInstance().query<{ name: string; description_locales: Record<string, string> }>(
            'SELECT name, description_locales FROM tv_auth.permissions WHERE permission_group = 7 ORDER BY name'
        );
        expect(result.rows.map((r) => r.name)).toEqual(['file_can_manage', 'file_can_view']);
        expect(result.rows[0].description_locales.ru).toBeTruthy();
    });

    it('grants file permissions to the roles of a new project', async () => {
        const result = await Database.getInstance().query<{ role: string; permission: string }>(
            `SELECT r.name AS role, p.name AS permission
             FROM collaboration.roles r
             JOIN collaboration.permissions_to_role pr ON pr.role_id = r.id
             JOIN tv_auth.permissions p ON p.id = pr.permission_id
             WHERE r.goal_id = $1 AND p.name LIKE 'file_%'
             ORDER BY r.name, p.name`,
            [goalId]
        );
        const byRole = new Map<string, string[]>();
        for (const r of result.rows) byRole.set(r.role, [...(byRole.get(r.role) ?? []), r.permission]);
        expect(byRole.get('editor')).toEqual(['file_can_manage', 'file_can_view']);
        expect(byRole.get('executor')).toEqual(['file_can_view']);
    });

    describe.each(['local', 's3'] as const)('with the %s provider', (provider) => {
        let taskFile: FileDto;
        let projectFile: FileDto;

        beforeAll(() => useProvider(provider));

        it('uploads a file straight into a task', async () => {
            const response = await upload({ goalId, taskId, name: 'spec.txt', content: 'hello attachments' });
            expect(response.status).toBe(200);
            taskFile = response.data.response;
            expect(taskFile).toMatchObject({
                goalId,
                name: 'spec.txt',
                originalName: 'spec.txt',
                mimeType: 'text/plain',
                sizeBytes: 17,
                uploaderEmail: LOGIN,
                linkedTaskIds: [taskId],
            });

            const row = await new FilesRepository().getById(taskFile.id);
            expect(row?.storageProvider).toBe(provider);
            expect(row?.storageKey).toBe(`${goalId}/${taskFile.id}`);
            expect(row?.checksumSha256).toHaveLength(64);
            expect(await FileStorageFactory.getInstance().get(provider).exists(row!.storageKey)).toBe(true);
        });

        it('lists the file under the task and counts it on the task row', async () => {
            const files = await api.get(`/module/files/task/${taskId}`, asUser());
            expect(files.status).toBe(200);
            expect(files.data.response.map((f: FileDto) => f.id)).toContain(taskFile.id);

            const task = await api.get(`/module/tasks/${taskId}`, asUser());
            expect(task.status).toBe(200);
            expect(task.data.response.filesCount).toBeGreaterThanOrEqual(1);
        });

        it('uploads a file into the project, then searches and filters the project list', async () => {
            const response = await upload({ goalId, name: `Диаграмма-${provider}.png`, content: Buffer.from([1, 2, 3, 4]), mime: 'image/png' });
            expect(response.status).toBe(200);
            projectFile = response.data.response;
            expect(projectFile.linkedTaskIds).toEqual([]);

            const all = await api.get<{ response: FileListPage }>(`/module/files/goal/${goalId}`, asUser());
            expect(all.status).toBe(200);
            expect(all.data.response.items.map((f) => f.id)).toEqual(expect.arrayContaining([taskFile.id, projectFile.id]));

            const search = await api.get<{ response: FileListPage }>(`/module/files/goal/${goalId}?search=диаграмма-${provider}`, asUser());
            expect(search.data.response.items.map((f) => f.id)).toEqual([projectFile.id]);

            const images = await api.get<{ response: FileListPage }>(`/module/files/goal/${goalId}?type=image`, asUser());
            expect(images.data.response.items.every((f) => f.mimeType.startsWith('image/'))).toBe(true);
            expect(images.data.response.items.map((f) => f.id)).toContain(projectFile.id);

            const documents = await api.get<{ response: FileListPage }>(`/module/files/goal/${goalId}?type=document`, asUser());
            expect(documents.data.response.items.map((f) => f.id)).not.toContain(projectFile.id);
        });

        it('paginates the project list with a cursor', async () => {
            const first = await api.get<{ response: FileListPage }>(`/module/files/goal/${goalId}?limit=1`, asUser());
            expect(first.data.response.items).toHaveLength(1);
            expect(first.data.response.nextCursor).toBeTruthy();

            const second = await api.get<{ response: FileListPage }>(
                `/module/files/goal/${goalId}?limit=1&cursor=${encodeURIComponent(first.data.response.nextCursor as string)}`,
                asUser()
            );
            expect(second.data.response.items).toHaveLength(1);
            expect(second.data.response.items[0].id).not.toBe(first.data.response.items[0].id);
        });

        it('links an existing project file to a task and refuses files of another project', async () => {
            const linked = await api.post(`/module/files/task/${taskId}/link`, { fileIds: [projectFile.id] }, asUser());
            expect(linked.status).toBe(200);
            expect(linked.data.response[0].linkedTaskIds).toEqual([taskId]);

            const foreign = await upload({ goalId: otherGoalId, name: 'foreign.txt', content: 'x' });
            expect(foreign.status).toBe(200);
            const crossProject = await api.post(`/module/files/task/${taskId}/link`, { fileIds: [foreign.data.response.id] }, asUser());
            expect(crossProject.status).toBe(403);

            const missing = await api.post(
                `/module/files/task/${taskId}/link`,
                { fileIds: ['00000000-0000-4000-8000-000000000000'] },
                asUser()
            );
            expect(missing.status).toBe(404);
        });

        it('unlinks a file from a task without deleting it', async () => {
            const unlinked = await api.delete(`/module/files/task/${taskId}/file/${projectFile.id}`, asUser());
            expect(unlinked.status).toBe(200);

            const again = await api.delete(`/module/files/task/${taskId}/file/${projectFile.id}`, asUser());
            expect(again.status).toBe(404);

            const stillThere = await api.get(`/module/files/file/${projectFile.id}`, asUser());
            expect(stillThere.status).toBe(200);
            expect(stillThere.data.response.linkedTaskIds).toEqual([]);
        });

        it('renames a file and keeps the original extension', async () => {
            const renamed = await api.patch(`/module/files/file/${taskFile.id}`, { name: 'renamed' }, asUser());
            expect(renamed.status).toBe(200);
            expect(renamed.data.response.name).toBe('renamed.txt');
            expect(renamed.data.response.originalName).toBe('spec.txt');

            const long = await api.patch(`/module/files/file/${taskFile.id}`, { name: 'x'.repeat(300) }, asUser());
            expect(long.status).toBe(200);
            expect(long.data.response.name).toHaveLength(255);
            expect(long.data.response.name.endsWith('.txt')).toBe(true);

            const emoji = await api.patch(`/module/files/file/${taskFile.id}`, { name: `${'😀'.repeat(300)}.txt` }, asUser());
            expect(emoji.status).toBe(200);
            expect(Array.from(emoji.data.response.name)).toHaveLength(255);
            expect(emoji.data.response.name.endsWith('.txt')).toBe(true);

            const back = await api.patch(`/module/files/file/${taskFile.id}`, { name: 'renamed' }, asUser());
            expect(back.status).toBe(200);
        });

        it('serves the content through a short-lived signed url, inline or as attachment', async () => {
            const attachment = await api.post(`/module/files/file/${taskFile.id}/download-url`, { inline: false }, asUser());
            expect(attachment.status).toBe(200);
            expect(attachment.data.response.url).toMatch(/^\/module\/files\/content\//);

            const content = await api.get(attachment.data.response.url, { responseType: 'arraybuffer' });
            expect(content.status).toBe(200);
            expect(Buffer.from(content.data).toString()).toBe('hello attachments');
            expect(content.headers['content-type']).toContain('text/plain');
            expect(content.headers['content-length']).toBe('17');
            expect(content.headers['content-disposition']).toContain('attachment');
            expect(content.headers['content-disposition']).toContain('renamed.txt');
            expect(content.headers['cross-origin-resource-policy']).toBe('cross-origin');

            const inline = await api.post(`/module/files/file/${taskFile.id}/download-url`, { inline: true }, asUser());
            const inlineContent = await api.get(inline.data.response.url);
            expect(inlineContent.headers['content-disposition']).toMatch(/^inline/);
        });

        it('rejects forged and expired content tokens', async () => {
            expect((await api.get('/module/files/content/not-a-token')).status).toBe(403);
            const expired = new FileDownloadTokens().sign({ fileId: taskFile.id, inline: false, exp: 1 });
            expect((await api.get(`/module/files/content/${expired}`)).status).toBe(403);
        });

        it('rejects a file over the size limit and leaves nothing behind', async () => {
            const before = await api.get<{ response: FileListPage }>(`/module/files/goal/${goalId}?limit=200`, asUser());
            const tooBig = await upload({ goalId, name: 'big.bin', content: Buffer.alloc(1024 * 1024 + 1) });
            expect(tooBig.status).toBe(413);
            const after = await api.get<{ response: FileListPage }>(`/module/files/goal/${goalId}?limit=200`, asUser());
            expect(after.data.response.items).toHaveLength(before.data.response.items.length);
        });

        it('deletes a file forever: links, row and stored object', async () => {
            const row = await new FilesRepository().getById(taskFile.id);
            const removed = await api.delete(`/module/files/file/${taskFile.id}`, asUser());
            expect(removed.status).toBe(200);

            expect((await api.get(`/module/files/file/${taskFile.id}`, asUser())).status).toBe(404);
            const files = await api.get(`/module/files/task/${taskId}`, asUser());
            expect(files.data.response.map((f: FileDto) => f.id)).not.toContain(taskFile.id);
            expect(await FileStorageFactory.getInstance().get(provider).exists(row!.storageKey)).toBe(false);
        });

        it('enforces file permissions and authentication', async () => {
            expect((await api.get(`/module/files/goal/${goalId}`)).status).toBe(401);
            expect((await upload({ goalId, name: 'anon.txt', content: 'x', auth: { headers: {} } })).status).toBe(401);

            const viewer = await issueToken([GoalPermissions.FILE_CAN_VIEW]);
            expect((await api.get(`/module/files/goal/${goalId}`, viewer)).status).toBe(200);
            expect((await upload({ goalId, name: 'viewer.txt', content: 'x', auth: viewer })).status).toBe(403);
            expect((await api.delete(`/module/files/file/${projectFile.id}`, viewer)).status).toBe(403);

            const stranger = await issueToken([GoalPermissions.TIMETRACKING_CAN_VIEW]);
            expect((await api.get(`/module/files/goal/${goalId}`, stranger)).status).toBe(403);
            expect((await api.get(`/module/files/task/${taskId}`, stranger)).status).toBe(403);

            expect((await api.get(`/module/files/goal/999999999`, asUser())).status).toBe(403);
        });
    });

    describe('storage migration between providers', () => {
        it('moves files local -> s3 and back while content keeps being served', async () => {
            useProvider('local');
            const uploaded = await upload({ goalId, name: 'migrate-me.txt', content: 'moving bytes' });
            expect(uploaded.status).toBe(200);
            const fileId = uploaded.data.response.id;
            const repository = new FilesRepository();
            const factory = FileStorageFactory.getInstance();
            const key = (await repository.getById(fileId))!.storageKey;

            const forward = await new FileStorageMigrator({ source: factory.get('local'), target: factory.get('s3'), repository, goalId }).run();
            expect(forward.skipped).toBe(0);
            expect(forward.migrated).toBeGreaterThanOrEqual(1);
            expect((await repository.getById(fileId))?.storageProvider).toBe('s3');
            expect(await factory.get('local').exists(key)).toBe(false);
            expect(await factory.get('s3').exists(key)).toBe(true);

            const link = await api.post(`/module/files/file/${fileId}/download-url`, { inline: false }, asUser());
            const content = await api.get(link.data.response.url);
            expect(content.status).toBe(200);
            expect(content.data).toBe('moving bytes');

            const back = await new FileStorageMigrator({ source: factory.get('s3'), target: factory.get('local'), repository, goalId }).run();
            expect(back.skipped).toBe(0);
            expect((await repository.getById(fileId))?.storageProvider).toBe('local');
            expect(await factory.get('local').exists(key)).toBe(true);
        });
    });
});
