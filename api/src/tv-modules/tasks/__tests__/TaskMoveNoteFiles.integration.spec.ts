import axios, { type AxiosInstance } from 'axios';
import { randomUUID } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { and, eq, inArray, like } from 'drizzle-orm';
import http from 'http';
import { FileToTaskSchema, FilesSchema, OrganizationsSchema, TasksSchema } from 'taskview-db-schemas';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import App from '../../../App';
import { Database } from '../../../modules/db';
import { GoalPermissions } from '../../../types/auth.types';
import { FileStorageFactory } from '../../files/storage/FileStorageFactory';
import type { FileDto, FileListPage, FileQuotaMode } from '../../files/types';
import { TaskNoteFileRefs } from '../TaskNoteFileRefs';
import type { TaskMovePreviewDto, TaskMoveResultDto } from '../task-move.types';

vi.mock('emailjs', () => ({
    SMTPClient: vi.fn().mockImplementation(() => ({ sendAsync: vi.fn().mockResolvedValue(true) })),
}));

const port = 1830;
const MB = 1024 * 1024;
const api: AxiosInstance = axios.create({
    baseURL: `http://localhost:${port}`,
    validateStatus: () => true,
    httpAgent: new http.Agent({ keepAlive: false }),
});
const db = () => Database.getInstance().dbDrizzle;

type Auth = { headers: { Authorization: string } };
type CreateGoalArgs = { name: string; organizationId?: number };
type CreateTaskArgs = { goalId: number; description: string; parentId?: number; note?: string };
type MoveArgs = { taskId: number; targetGoalId: number; auth?: Auth };
type UploadArgs = { goalId: number; taskId?: number; content?: string; bytes?: number };
type SetNoteArgs = { taskId: number; note: string };
type LinkArgs = { taskId: number; fileId: string };
type QuotaArgs = { mode: FileQuotaMode; organizationId?: number; quotaMb?: number };
type FileInGoalArgs = { goalId: number; name: string };
type TaskWithImage = { taskId: number; file: FileDto; note: string };

let server: http.Server;
let ownerAuth: Auth;
let goalA = 0;
let goalB = 0;
let goalC = 0;
let otherOrgId = 0;
let goalOtherOrg = 0;
const goalIds: number[] = [];
const orgIds: number[] = [];
const tokenIds: number[] = [];
const savedEnv = {
    quotaMode: process.env.FILE_QUOTA_MODE,
    provider: process.env.FILE_STORAGE_PROVIDER,
    localDir: process.env.FILE_STORAGE_LOCAL_DIR,
};

const img = (fileId: string) => `<img data-file-id="${fileId}" alt="shot.png">`;

async function createOrg(name: string): Promise<number> {
    const response = await api.post('/module/organizations', { name: `${name}-${Date.now()}` }, ownerAuth);
    expect(response.status).toBe(200);
    orgIds.push(response.data.response.id);
    return response.data.response.id;
}

async function createGoal(args: CreateGoalArgs): Promise<number> {
    const response = await api.post('/module/goals', { name: `${args.name}-${Date.now()}`, organizationId: args.organizationId }, ownerAuth);
    expect(response.status).toBe(200);
    goalIds.push(response.data.response.id);
    return response.data.response.id;
}

async function setNote(args: SetNoteArgs) {
    const response = await api.patch('/module/tasks', { id: args.taskId, note: args.note }, ownerAuth);
    expect(response.status).toBe(200);
}

async function createTask(args: CreateTaskArgs): Promise<number> {
    const response = await api.post('/module/tasks', { goalId: args.goalId, description: args.description, parentId: args.parentId }, ownerAuth);
    expect(response.status).toBe(200);
    const taskId: number = response.data.response[0]?.id ?? response.data.response.id;
    if (args.note !== undefined) await setNote({ taskId, note: args.note });
    return taskId;
}

async function upload(args: UploadArgs): Promise<FileDto> {
    const form = new FormData();
    const part = args.bytes !== undefined ? new Uint8Array(args.bytes).fill(7) : (args.content ?? 'png bytes');
    form.append('file', new Blob([part], { type: 'image/png' }), `shot-${randomUUID()}.png`);
    const query = args.taskId ? `?taskId=${args.taskId}` : '';
    const response = await api.post<{ response: FileDto }>(`/module/files/goal/${args.goalId}${query}`, form, ownerAuth);
    expect(response.status).toBe(200);
    return response.data.response;
}

async function link(args: LinkArgs) {
    const response = await api.post(`/module/files/task/${args.taskId}/link`, { fileIds: [args.fileId] }, ownerAuth);
    expect(response.status).toBe(200);
}

// A task whose note shows an image of its own, the way the editor leaves it: uploaded to the project, attached to the task
async function taskWithImage(goalId: number, content = 'png bytes'): Promise<TaskWithImage> {
    const taskId = await createTask({ goalId, description: `note image ${randomUUID()}` });
    const file = await upload({ goalId, taskId, content });
    const note = `<p>before</p>${img(file.id)}<p>after</p>`;
    await setNote({ taskId, note });
    return { taskId, file, note };
}

function preview(args: MoveArgs) {
    return api.get<{ response: TaskMovePreviewDto }>(`/module/tasks/${args.taskId}/move-preview?targetGoalId=${args.targetGoalId}`, args.auth ?? ownerAuth);
}

function move(args: MoveArgs) {
    return api.post<{ response: TaskMoveResultDto }>('/module/tasks/move', { taskId: args.taskId, targetGoalId: args.targetGoalId }, args.auth ?? ownerAuth);
}

async function tokenWithout(excluded: string[]): Promise<Auth> {
    const allowedPermissions = Object.values(GoalPermissions).filter((p) => !excluded.includes(p));
    const response = await api.post('/module/api-tokens', { name: `note-files-${Date.now()}`, allowedPermissions, allowedGoalIds: [] }, ownerAuth);
    expect(response.status).toBe(200);
    tokenIds.push(response.data.response.item.id);
    return { headers: { Authorization: `Bearer ${response.data.response.token}` } };
}

async function taskRow(id: number) {
    const [row] = await db().select().from(TasksSchema).where(eq(TasksSchema.id, id));
    return row;
}

async function fileRow(id: string) {
    const [row] = await db().select().from(FilesSchema).where(eq(FilesSchema.id, id));
    return row;
}

async function filesNamed(args: FileInGoalArgs) {
    return db().select().from(FilesSchema).where(and(eq(FilesSchema.goalId, args.goalId), eq(FilesSchema.name, args.name)));
}

async function linkedTasks(fileId: string): Promise<number[]> {
    const rows = await db().select({ taskId: FileToTaskSchema.taskId }).from(FileToTaskSchema).where(eq(FileToTaskSchema.fileId, fileId));
    return rows.map((row) => row.taskId).sort((a, b) => a - b);
}

async function linkedFiles(taskId: number): Promise<string[]> {
    const rows = await db().select({ fileId: FileToTaskSchema.fileId }).from(FileToTaskSchema).where(eq(FileToTaskSchema.taskId, taskId));
    return rows.map((row) => row.fileId).sort();
}

async function download(fileId: string): Promise<string> {
    const issued = await api.post(`/module/files/file/${fileId}/download-url`, {}, ownerAuth);
    expect(issued.status).toBe(200);
    const content = await api.get(issued.data.response.url, { responseType: 'arraybuffer' });
    expect(content.status).toBe(200);
    return Buffer.from(content.data).toString();
}

async function listedFileIds(goalId: number): Promise<string[]> {
    const page = await api.get<{ response: FileListPage }>(`/module/files/goal/${goalId}?limit=200`, ownerAuth);
    expect(page.status).toBe(200);
    return page.data.response.items.map((file) => file.id);
}

// Objects in the storage folder of a project that no file row points at
async function orphanedObjects(goalId: number): Promise<string[]> {
    const dir = join(resolve(process.env.FILE_STORAGE_LOCAL_DIR as string), String(goalId));
    const onDisk = await readdir(dir).catch(() => [] as string[]);
    const rows = await db().select({ storageKey: FilesSchema.storageKey }).from(FilesSchema).where(like(FilesSchema.storageKey, `${goalId}/%`));
    const known = new Set(rows.map((row) => row.storageKey));
    return onDisk.filter((name) => !known.has(`${goalId}/${name}`));
}

async function useQuota(args: QuotaArgs) {
    process.env.FILE_QUOTA_MODE = args.mode;
    FileStorageFactory.resetInstance();
    if (args.organizationId !== undefined) {
        await db().update(OrganizationsSchema).set({ fileQuotaMb: args.quotaMb ?? null }).where(eq(OrganizationsSchema.id, args.organizationId));
    }
}

function restoreStorageEnv() {
    for (const [key, value] of [
        ['FILE_QUOTA_MODE', savedEnv.quotaMode],
        ['FILE_STORAGE_PROVIDER', savedEnv.provider],
        ['FILE_STORAGE_LOCAL_DIR', savedEnv.localDir],
    ] as const) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
    FileStorageFactory.resetInstance();
}

describe('Images in notes when a task goes to another project', () => {
    beforeAll(async () => {
        server = new App(port).listen();
        const login = await api.post('/module/auth/login', { login: 'test@mail.dest', password: 'user1!#Q' });
        expect(login.status).toBe(200);
        ownerAuth = { headers: { Authorization: `Bearer ${login.data.access}` } };

        goalA = await createGoal({ name: 'note-files-A' });
        goalB = await createGoal({ name: 'note-files-B' });
        goalC = await createGoal({ name: 'note-files-C' });
        otherOrgId = await createOrg('note-files-org');
        goalOtherOrg = await createGoal({ name: 'note-files-other-org', organizationId: otherOrgId });
    }, 30_000);

    afterEach(() => restoreStorageEnv());

    afterAll(async () => {
        restoreStorageEnv();
        for (const id of tokenIds) await api.delete('/module/api-tokens', { ...ownerAuth, data: { id } });
        for (const goalId of goalIds) {
            for (const id of await listedFileIds(goalId)) await api.delete(`/module/files/file/${id}`, ownerAuth);
        }
        for (const goalId of goalIds) await api.delete('/module/goals', { ...ownerAuth, data: { goalId } });
        for (const orgId of orgIds) await api.delete(`/module/organizations/${orgId}`, ownerAuth);
        if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    }, 60_000);

    describe('a file only the moved task uses', () => {
        it('reports it as moved in the preview, with the exact set of preview fields', async () => {
            const { taskId } = await taskWithImage(goalA);

            const shown = await preview({ taskId, targetGoalId: goalB });
            expect(shown.status).toBe(200);
            expect(shown.data.response).toEqual({
                allowed: true,
                reason: null,
                mode: 'move',
                tasks: 1,
                timeEntries: 0,
                removals: { tags: 0, assignees: 0, fileLinks: 0, dependencies: 0, sprintOutcomes: 0, integrationLinks: 0, recurrence: 0 },
                leftBehind: { subtasks: 0, timeEntries: 0 },
                noteFiles: { moved: 1, copied: 0, left: 0 },
            });
            // A preview changes nothing
            expect(await linkedFiles(taskId)).toHaveLength(1);
            expect((await taskRow(taskId)).goalId).toBe(goalA);
        });

        it('changes project with the task, stays attached and downloadable, the note is untouched', async () => {
            const { taskId, file, note } = await taskWithImage(goalA, 'sole use bytes');

            const moved = await move({ taskId, targetGoalId: goalB });
            expect(moved.status).toBe(200);
            expect(moved.data.response).toEqual({ mode: 'move', taskId, goalId: goalB });

            expect((await fileRow(file.id)).goalId).toBe(goalB);
            expect(await linkedTasks(file.id)).toEqual([taskId]);
            expect(await taskRow(taskId)).toMatchObject({ goalId: goalB, note });
            expect(await download(file.id)).toBe('sole use bytes');
            expect(await listedFileIds(goalB)).toContain(file.id);
            expect(await listedFileIds(goalA)).not.toContain(file.id);
            expect(await filesNamed({ goalId: goalB, name: file.name })).toHaveLength(1);

            const ofTask = await api.get<{ response: FileDto[] }>(`/module/files/task/${taskId}`, ownerAuth);
            expect(ofTask.status).toBe(200);
            expect(ofTask.data.response.map((f) => f.id)).toEqual([file.id]);
        });

        it('moves once however many times the note shows it, whatever the quotes and the case of the id', async () => {
            const taskId = await createTask({ goalId: goalA, description: 'shown twice' });
            const file = await upload({ goalId: goalA, taskId });
            const note = `<img data-file-id='${file.id.toUpperCase()}'>${img(file.id)}`;
            await setNote({ taskId, note });

            expect((await preview({ taskId, targetGoalId: goalB })).data.response.noteFiles).toEqual({ moved: 1, copied: 0, left: 0 });
            expect((await move({ taskId, targetGoalId: goalB })).status).toBe(200);
            expect((await fileRow(file.id)).goalId).toBe(goalB);
            expect(await linkedTasks(file.id)).toEqual([taskId]);
            expect((await taskRow(taskId)).note).toBe(note);
        });

        it('travels with the task when the note shows it without the file being attached', async () => {
            const file = await upload({ goalId: goalA });
            const taskId = await createTask({ goalId: goalA, description: 'shown, not attached', note: img(file.id) });

            expect((await preview({ taskId, targetGoalId: goalB })).data.response.noteFiles).toEqual({ moved: 1, copied: 0, left: 0 });
            expect((await move({ taskId, targetGoalId: goalB })).status).toBe(200);
            expect((await fileRow(file.id)).goalId).toBe(goalB);
            expect((await taskRow(taskId)).note).toBe(img(file.id));
        });
    });

    describe('a file a staying task also uses', () => {
        it('is duplicated when it is attached to a task that stays', async () => {
            const { taskId, file, note } = await taskWithImage(goalA, 'shared by attachment');
            const staying = await createTask({ goalId: goalA, description: 'stays, has the file attached' });
            await link({ taskId: staying, fileId: file.id });

            expect((await preview({ taskId, targetGoalId: goalB })).data.response.noteFiles).toEqual({ moved: 0, copied: 1, left: 0 });
            expect((await move({ taskId, targetGoalId: goalB })).status).toBe(200);

            // The original stays where it was, with the staying task
            expect(await fileRow(file.id)).toMatchObject({ goalId: goalA, name: file.name });
            expect(await linkedTasks(file.id)).toEqual([staying]);
            expect(await download(file.id)).toBe('shared by attachment');

            const copies = await filesNamed({ goalId: goalB, name: file.name });
            expect(copies).toHaveLength(1);
            const [copy] = copies;
            expect(copy.id).not.toBe(file.id);
            expect(copy).toMatchObject({ sizeBytes: file.sizeBytes, mimeType: file.mimeType, originalName: file.originalName });
            expect(copy.storageKey).not.toBe((await fileRow(file.id)).storageKey);
            expect(await linkedTasks(copy.id)).toEqual([taskId]);
            expect(await linkedFiles(taskId)).toEqual([copy.id]);
            expect(await download(copy.id)).toBe('shared by attachment');

            const moved = await taskRow(taskId);
            expect(moved.goalId).toBe(goalB);
            expect(moved.note).toBe(note.replace(file.id, copy.id));
        });

        it('is duplicated when the note of a staying task shows it, and that note keeps the original', async () => {
            const { taskId, file } = await taskWithImage(goalA, 'shared by note');
            const stayingNote = `<p>same picture</p>${img(file.id)}`;
            const staying = await createTask({ goalId: goalA, description: 'stays, shows the file', note: stayingNote });

            expect((await preview({ taskId, targetGoalId: goalB })).data.response.noteFiles).toEqual({ moved: 0, copied: 1, left: 0 });
            expect((await move({ taskId, targetGoalId: goalB })).status).toBe(200);

            expect((await fileRow(file.id)).goalId).toBe(goalA);
            expect(await taskRow(staying)).toMatchObject({ goalId: goalA, note: stayingNote });
            expect(await download(file.id)).toBe('shared by note');

            const [copy] = await filesNamed({ goalId: goalB, name: file.name });
            expect(copy).toBeDefined();
            expect(TaskNoteFileRefs.extract((await taskRow(taskId)).note)).toEqual([copy.id]);
            expect(await linkedTasks(copy.id)).toEqual([taskId]);
            expect(await download(copy.id)).toBe('shared by note');
        });

        it('is not taken away from a staying task whose note writes the id in upper case', async () => {
            const { taskId, file } = await taskWithImage(goalA);
            const stayingNote = `<img data-file-id="${file.id.toUpperCase()}">`;
            const staying = await createTask({ goalId: goalA, description: 'stays, shows the file in upper case', note: stayingNote });

            expect((await preview({ taskId, targetGoalId: goalB })).data.response.noteFiles).toEqual({ moved: 0, copied: 1, left: 0 });
            expect((await move({ taskId, targetGoalId: goalB })).status).toBe(200);
            expect((await fileRow(file.id)).goalId).toBe(goalA);
            expect((await taskRow(staying)).note).toBe(stayingNote);
        });

        it('deleting the original afterwards does not break the copy', async () => {
            const { taskId, file } = await taskWithImage(goalA, 'survives the original');
            const staying = await createTask({ goalId: goalA, description: 'stays' });
            await link({ taskId: staying, fileId: file.id });
            expect((await move({ taskId, targetGoalId: goalB })).status).toBe(200);
            const [copy] = await filesNamed({ goalId: goalB, name: file.name });
            expect(copy).toBeDefined();

            expect((await api.delete(`/module/files/file/${file.id}`, ownerAuth)).status).toBe(200);
            expect(await download(copy.id)).toBe('survives the original');
        });
    });

    describe('copy mode, without the right to delete tasks in the source project', () => {
        it('leaves the original task, note and file untouched and gives the new task a copy in the target project', async () => {
            const auth = await tokenWithout([GoalPermissions.TASKS_CAN_DELETE]);
            const { taskId, file, note } = await taskWithImage(goalA, 'copied with the task');

            const shown = await preview({ taskId, targetGoalId: goalB, auth });
            expect(shown.data.response).toMatchObject({ allowed: true, mode: 'copy', noteFiles: { moved: 0, copied: 1, left: 0 } });

            const copied = await move({ taskId, targetGoalId: goalB, auth });
            expect(copied.status).toBe(200);
            expect(copied.data.response.mode).toBe('copy');
            const newTaskId = copied.data.response.taskId;
            expect(newTaskId).not.toBe(taskId);

            expect(await taskRow(taskId)).toMatchObject({ goalId: goalA, note });
            expect(await fileRow(file.id)).toMatchObject({ goalId: goalA, name: file.name });
            expect(await linkedTasks(file.id)).toEqual([taskId]);
            expect(await download(file.id)).toBe('copied with the task');

            const copies = await filesNamed({ goalId: goalB, name: file.name });
            expect(copies).toHaveLength(1);
            const [copy] = copies;
            expect(copy.id).not.toBe(file.id);
            expect(await taskRow(newTaskId)).toMatchObject({ goalId: goalB, note: note.replace(file.id, copy.id) });
            expect(await linkedTasks(copy.id)).toEqual([newTaskId]);
            expect(await download(copy.id)).toBe('copied with the task');
        });
    });

    describe('a file that cannot be taken', () => {
        it.each([
            ['view files', GoalPermissions.FILE_CAN_VIEW],
            ['manage files', GoalPermissions.FILE_CAN_MANAGE],
        ])('stays in the source project without the right to %s, the task moves anyway', async (_label, permission) => {
            const auth = await tokenWithout([permission]);
            const { taskId, file, note } = await taskWithImage(goalA);

            const shown = await preview({ taskId, targetGoalId: goalB, auth });
            expect(shown.data.response).toMatchObject({ allowed: true, mode: 'move', noteFiles: { moved: 0, copied: 0, left: 1 } });

            expect((await move({ taskId, targetGoalId: goalB, auth })).status).toBe(200);
            expect(await taskRow(taskId)).toMatchObject({ goalId: goalB, note });
            expect((await fileRow(file.id)).goalId).toBe(goalA);
            expect(await filesNamed({ goalId: goalB, name: file.name })).toEqual([]);
            expect(await orphanedObjects(goalB)).toEqual([]);
        });

        it('stays when a copy is needed and storage is not configured', async () => {
            const { taskId, file, note } = await taskWithImage(goalA);
            const staying = await createTask({ goalId: goalA, description: 'stays' });
            await link({ taskId: staying, fileId: file.id });

            delete process.env.FILE_STORAGE_PROVIDER;
            delete process.env.FILE_STORAGE_LOCAL_DIR;
            FileStorageFactory.resetInstance();

            expect((await preview({ taskId, targetGoalId: goalB })).data.response.noteFiles).toEqual({ moved: 0, copied: 0, left: 1 });
            expect((await move({ taskId, targetGoalId: goalB })).status).toBe(200);
            restoreStorageEnv();

            expect(await taskRow(taskId)).toMatchObject({ goalId: goalB, note });
            expect((await fileRow(file.id)).goalId).toBe(goalA);
            expect(await linkedTasks(file.id)).toEqual([staying]);
            expect(await filesNamed({ goalId: goalB, name: file.name })).toEqual([]);
        });
    });

    describe('ids in a note that are not files of the source project', () => {
        it.each([
            ['another project of the organization', () => goalC],
            ['a project of another organization', () => goalOtherOrg],
        ])('never touches a file of %s', async (_label, foreignGoal) => {
            const foreign = await upload({ goalId: foreignGoal(), content: 'not yours to take' });
            const note = `<p>text</p>${img(foreign.id)}`;
            const taskId = await createTask({ goalId: goalA, description: 'names a foreign file', note });

            const shown = await preview({ taskId, targetGoalId: goalB });
            expect(shown.data.response.noteFiles).toEqual({ moved: 0, copied: 0, left: 0 });
            expect(shown.data.response.removals?.fileLinks).toBe(0);

            expect((await move({ taskId, targetGoalId: goalB })).status).toBe(200);
            expect(await fileRow(foreign.id)).toMatchObject({ goalId: foreignGoal(), name: foreign.name });
            expect(await linkedTasks(foreign.id)).toEqual([]);
            expect(await filesNamed({ goalId: goalB, name: foreign.name })).toEqual([]);
            expect(await taskRow(taskId)).toMatchObject({ goalId: goalB, note });
            expect(await download(foreign.id)).toBe('not yours to take');
        });

        it('never copies a foreign file in copy mode either', async () => {
            const auth = await tokenWithout([GoalPermissions.TASKS_CAN_DELETE]);
            const foreign = await upload({ goalId: goalC });
            const taskId = await createTask({ goalId: goalA, description: 'copy names a foreign file', note: img(foreign.id) });

            expect((await preview({ taskId, targetGoalId: goalB, auth })).data.response.noteFiles).toEqual({ moved: 0, copied: 0, left: 0 });
            const copied = await move({ taskId, targetGoalId: goalB, auth });
            expect(copied.status).toBe(200);
            expect(await filesNamed({ goalId: goalB, name: foreign.name })).toEqual([]);
            expect((await taskRow(copied.data.response.taskId)).note).toBe(img(foreign.id));
            expect(await linkedFiles(copied.data.response.taskId)).toEqual([]);
        });

        it('ignores random and malformed ids and still moves the real file next to them', async () => {
            const { taskId, file } = await taskWithImage(goalA);
            const junk = [
                img(randomUUID()),
                '<img data-file-id="../../x">',
                '<img data-file-id="42">',
                `<img data-file-id="${file.id}/../x">`,
                '<img data-file-id="">',
                '<img src="https://example.com/a.png">',
                ...Array.from({ length: 200 }, () => img(randomUUID())),
            ].join('');
            const note = `${junk}${img(file.id)}`;
            await setNote({ taskId, note });

            const shown = await preview({ taskId, targetGoalId: goalB });
            expect(shown.status).toBe(200);
            expect(shown.data.response.noteFiles).toEqual({ moved: 1, copied: 0, left: 0 });
            expect((await move({ taskId, targetGoalId: goalB })).status).toBe(200);
            expect(await taskRow(taskId)).toMatchObject({ goalId: goalB, note });
            expect((await fileRow(file.id)).goalId).toBe(goalB);
        });

        it('counts nothing for a note of random ids only', async () => {
            const taskId = await createTask({ goalId: goalA, description: 'random ids', note: `${img(randomUUID())}${img(randomUUID())}` });
            expect((await preview({ taskId, targetGoalId: goalB })).data.response.noteFiles).toEqual({ moved: 0, copied: 0, left: 0 });
            expect((await move({ taskId, targetGoalId: goalB })).status).toBe(200);
        });
    });

    describe('files attached to the task but not shown in its note', () => {
        it('are detached and stay in the source project, and only they are counted as removed links', async () => {
            const { taskId, file: shown, note } = await taskWithImage(goalA);
            const attached = await upload({ goalId: goalA, taskId, content: 'ordinary attachment' });

            const response = (await preview({ taskId, targetGoalId: goalB })).data.response;
            expect(response.noteFiles).toEqual({ moved: 1, copied: 0, left: 0 });
            expect(response.removals?.fileLinks).toBe(1);

            expect((await move({ taskId, targetGoalId: goalB })).status).toBe(200);
            expect((await fileRow(attached.id)).goalId).toBe(goalA);
            expect(await linkedTasks(attached.id)).toEqual([]);
            expect(await download(attached.id)).toBe('ordinary attachment');
            expect((await fileRow(shown.id)).goalId).toBe(goalB);
            expect(await linkedFiles(taskId)).toEqual([shown.id]);
            expect((await taskRow(taskId)).note).toBe(note);
        });

        it('behave as before for a task without images in the note', async () => {
            const taskId = await createTask({ goalId: goalA, description: 'no images', note: '<p>plain</p>' });
            const attached = await upload({ goalId: goalA, taskId });

            const response = (await preview({ taskId, targetGoalId: goalB })).data.response;
            expect(response.noteFiles).toEqual({ moved: 0, copied: 0, left: 0 });
            expect(response.removals?.fileLinks).toBe(1);
            expect((await move({ taskId, targetGoalId: goalB })).status).toBe(200);
            expect((await fileRow(attached.id)).goalId).toBe(goalA);
            expect(await linkedFiles(taskId)).toEqual([]);
            expect((await taskRow(taskId)).note).toBe('<p>plain</p>');
        });
    });

    describe('subtasks', () => {
        it('take the images of their notes along by the same rules', async () => {
            const root = await createTask({ goalId: goalA, description: 'root with subtasks' });
            const sub = await createTask({ goalId: goalA, description: 'subtask with image', parentId: root });
            const own = await upload({ goalId: goalA, taskId: sub, content: 'subtask only' });
            const both = await upload({ goalId: goalA, taskId: root, content: 'root and subtask' });
            const shared = await upload({ goalId: goalA, taskId: sub, content: 'subtask and a staying task' });
            const staying = await createTask({ goalId: goalA, description: 'stays' });
            await link({ taskId: staying, fileId: shared.id });
            await link({ taskId: sub, fileId: both.id });
            await setNote({ taskId: root, note: img(both.id) });
            const subNote = `${img(own.id)}${img(both.id)}${img(shared.id)}`;
            await setNote({ taskId: sub, note: subNote });

            const shown = (await preview({ taskId: root, targetGoalId: goalB })).data.response;
            expect(shown).toMatchObject({ tasks: 2, noteFiles: { moved: 2, copied: 1, left: 0 } });
            expect((await move({ taskId: root, targetGoalId: goalB })).status).toBe(200);

            expect((await fileRow(own.id)).goalId).toBe(goalB);
            expect(await linkedTasks(own.id)).toEqual([sub]);
            expect((await fileRow(both.id)).goalId).toBe(goalB);
            expect(await linkedTasks(both.id)).toEqual([root, sub].sort((a, b) => a - b));
            expect((await taskRow(root)).note).toBe(img(both.id));

            expect((await fileRow(shared.id)).goalId).toBe(goalA);
            expect(await linkedTasks(shared.id)).toEqual([staying]);
            const [copy] = await filesNamed({ goalId: goalB, name: shared.name });
            expect(copy).toBeDefined();
            expect(await linkedTasks(copy.id)).toEqual([sub]);
            expect(await taskRow(sub)).toMatchObject({ goalId: goalB, note: `${img(own.id)}${img(both.id)}${img(copy.id)}` });
            expect(await download(copy.id)).toBe('subtask and a staying task');
        });

        it('left behind keep their files, and a file they share with the root is duplicated', async () => {
            const auth = await tokenWithout([GoalPermissions.TASKS_CAN_ADD_SUBTASKS]);
            const root = await createTask({ goalId: goalA, description: 'root leaving subtasks' });
            const sub = await createTask({ goalId: goalA, description: 'left behind', parentId: root });
            const ofSub = await upload({ goalId: goalA, taskId: sub, content: 'stays with the subtask' });
            const ofRoot = await upload({ goalId: goalA, taskId: root, content: 'goes with the root' });
            const both = await upload({ goalId: goalA, taskId: sub, content: 'in both notes' });
            const subNote = `${img(ofSub.id)}${img(both.id)}`;
            await setNote({ taskId: sub, note: subNote });
            await setNote({ taskId: root, note: `${img(ofRoot.id)}${img(both.id)}` });

            const shown = (await preview({ taskId: root, targetGoalId: goalB, auth })).data.response;
            expect(shown).toMatchObject({ tasks: 1, leftBehind: { subtasks: 1 }, noteFiles: { moved: 1, copied: 1, left: 0 } });
            expect((await move({ taskId: root, targetGoalId: goalB, auth })).status).toBe(200);

            expect(await taskRow(sub)).toMatchObject({ goalId: goalA, note: subNote });
            expect((await fileRow(ofSub.id)).goalId).toBe(goalA);
            expect(await linkedTasks(ofSub.id)).toEqual([sub]);
            expect((await fileRow(both.id)).goalId).toBe(goalA);
            expect(await linkedTasks(both.id)).toEqual([sub]);

            expect((await fileRow(ofRoot.id)).goalId).toBe(goalB);
            const [copy] = await filesNamed({ goalId: goalB, name: both.name });
            expect(copy).toBeDefined();
            expect(await taskRow(root)).toMatchObject({ goalId: goalB, note: `${img(ofRoot.id)}${img(copy.id)}` });
            expect(await linkedFiles(root)).toEqual([ofRoot.id, copy.id].sort());
        });
    });

    describe('the storage quota of the organization', () => {
        it('keeps a copy that does not fit out: counted as left, the task moves, nothing is stored', async () => {
            const org = await createOrg('note-files-quota');
            const source = await createGoal({ name: 'quota-src', organizationId: org });
            const target = await createGoal({ name: 'quota-dst', organizationId: org });
            const taskId = await createTask({ goalId: source, description: 'big shared image' });
            const file = await upload({ goalId: source, taskId, bytes: 600_000 });
            const staying = await createTask({ goalId: source, description: 'stays' });
            await link({ taskId: staying, fileId: file.id });
            await setNote({ taskId, note: img(file.id) });
            await useQuota({ mode: 'enforce', organizationId: org, quotaMb: 1 });

            expect((await preview({ taskId, targetGoalId: target })).data.response.noteFiles).toEqual({ moved: 0, copied: 0, left: 1 });
            const moved = await move({ taskId, targetGoalId: target });
            expect(moved.status).toBe(200);

            expect(await taskRow(taskId)).toMatchObject({ goalId: target, note: img(file.id) });
            expect((await fileRow(file.id)).goalId).toBe(source);
            expect(await linkedTasks(file.id)).toEqual([staying]);
            expect(await db().select().from(FilesSchema).where(eq(FilesSchema.goalId, target))).toEqual([]);
            expect(await orphanedObjects(target)).toEqual([]);
            const quota = await api.get(`/module/files/goal/${source}/quota`, ownerAuth);
            expect(quota.data.response).toEqual({ mode: 'enforce', quotaBytes: MB, usedBytes: 600_000 });
        });

        it('moves a file that needs no copy even when the quota is used up', async () => {
            const org = await createOrg('note-files-quota-move');
            const source = await createGoal({ name: 'quota-move-src', organizationId: org });
            const target = await createGoal({ name: 'quota-move-dst', organizationId: org });
            const taskId = await createTask({ goalId: source, description: 'big own image' });
            const file = await upload({ goalId: source, taskId, bytes: 900_000 });
            await setNote({ taskId, note: img(file.id) });
            await useQuota({ mode: 'enforce', organizationId: org, quotaMb: 1 });

            expect((await preview({ taskId, targetGoalId: target })).data.response.noteFiles).toEqual({ moved: 1, copied: 0, left: 0 });
            expect((await move({ taskId, targetGoalId: target })).status).toBe(200);
            expect((await fileRow(file.id)).goalId).toBe(target);
        });

        it('never exceeds the quota when two moves copy into it in parallel, and leaves no orphaned bytes', async () => {
            const org = await createOrg('note-files-quota-race');
            const source = await createGoal({ name: 'quota-race-src', organizationId: org });
            // One target each: two moves into the same project collide on the task order, which is a separate matter
            const targets = [
                await createGoal({ name: 'quota-race-dst-1', organizationId: org }),
                await createGoal({ name: 'quota-race-dst-2', organizationId: org }),
            ];
            const staying = await createTask({ goalId: source, description: 'stays' });
            const tasks: TaskWithImage[] = [];
            for (const description of ['race one', 'race two']) {
                const taskId = await createTask({ goalId: source, description });
                const file = await upload({ goalId: source, taskId, bytes: 600_000 });
                await link({ taskId: staying, fileId: file.id });
                await setNote({ taskId, note: img(file.id) });
                tasks.push({ taskId, file, note: img(file.id) });
            }
            // 1.2 MB used of 2 MB: either copy fits alone, both together do not
            await useQuota({ mode: 'enforce', organizationId: org, quotaMb: 2 });

            const results = await Promise.all(tasks.map(({ taskId }, i) => move({ taskId, targetGoalId: targets[i] })));
            expect(results.map((r) => r.status)).toEqual([200, 200]);

            const inTargets = await db().select().from(FilesSchema).where(inArray(FilesSchema.goalId, targets));
            expect(inTargets).toHaveLength(1);
            const quota = await api.get(`/module/files/goal/${source}/quota`, ownerAuth);
            expect(quota.data.response.usedBytes).toBe(1_800_000);
            for (const target of targets) expect(await orphanedObjects(target)).toEqual([]);

            // One task shows its own copy, attached to it; the other still shows the original
            const [copy] = inTargets;
            const notes = await Promise.all(tasks.map(async ({ taskId }) => (await taskRow(taskId)).note));
            expect(notes.filter((note) => note === img(copy.id))).toHaveLength(1);
            expect(notes.filter((note, i) => note === tasks[i].note)).toHaveLength(1);
            const winner = notes.indexOf(img(copy.id));
            expect(copy).toMatchObject({ name: tasks[winner].file.name, goalId: targets[winner] });
            expect(await linkedTasks(copy.id)).toEqual([tasks[winner].taskId]);
            for (const { file } of tasks) expect((await fileRow(file.id)).goalId).toBe(source);
        }, 20_000);
    });

    describe('moves running in parallel', () => {
        it('answers both when two tasks go into the same project at once', async () => {
            const first = await createTask({ goalId: goalA, description: 'parallel one' });
            const second = await createTask({ goalId: goalA, description: 'parallel two' });

            const results = await Promise.all(
                [first, second].map((taskId) => api.post('/module/tasks/move', { taskId, targetGoalId: goalB }, { ...ownerAuth, timeout: 4000 }).catch((err) => ({ status: String(err.code) })))
            );
            expect(results.map((r) => r.status)).toEqual([200, 200]);
            expect((await taskRow(first)).goalId).toBe(goalB);
            expect((await taskRow(second)).goalId).toBe(goalB);
        }, 10_000);
    });

    describe('access', () => {
        it('refuses the preview and the move without a session and changes nothing', async () => {
            const { taskId, file } = await taskWithImage(goalA);
            const anonymous = { headers: { Authorization: '' } };
            expect((await preview({ taskId, targetGoalId: goalB, auth: anonymous })).status).toBe(401);
            expect((await move({ taskId, targetGoalId: goalB, auth: anonymous })).status).toBe(401);
            expect((await taskRow(taskId)).goalId).toBe(goalA);
            expect((await fileRow(file.id)).goalId).toBe(goalA);
        });

        it('reports no note files when the move is not allowed', async () => {
            const { taskId, file } = await taskWithImage(goalA);
            for (const targetGoalId of [goalA, goalOtherOrg]) {
                const shown = await preview({ taskId, targetGoalId });
                expect(shown.data.response).toMatchObject({ allowed: false, noteFiles: null, removals: null });
                expect((await move({ taskId, targetGoalId })).status).toBe(400);
            }
            expect((await fileRow(file.id)).goalId).toBe(goalA);
            expect(await linkedTasks(file.id)).toEqual([taskId]);
        });

        it('does not take the file along when a token without access to the target project asks', async () => {
            const { taskId, file } = await taskWithImage(goalA);
            const auth = await tokenWithout([GoalPermissions.COMPONENT_CAN_ADD_TASKS]);
            expect((await preview({ taskId, targetGoalId: goalB, auth })).data.response).toMatchObject({ allowed: false, noteFiles: null });
            expect((await move({ taskId, targetGoalId: goalB, auth })).status).toBeGreaterThanOrEqual(400);
            expect((await taskRow(taskId)).goalId).toBe(goalA);
            expect((await fileRow(file.id)).goalId).toBe(goalA);
        });
    });
});
