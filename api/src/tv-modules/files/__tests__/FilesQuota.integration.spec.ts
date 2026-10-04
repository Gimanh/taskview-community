import axios, { type AxiosInstance } from 'axios';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import http from 'http';
import { join } from 'path';
import { OrganizationsSchema } from 'taskview-db-schemas';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import App from '../../../App';
import { Database } from '../../../modules/db';
import { FilesRepository } from '../FilesRepository';
import { FileStorageFactory } from '../storage/FileStorageFactory';
import type { FileDto, FileInsertArgs, FileListPage, FileQuotaDto, FileQuotaMode } from '../types';

vi.mock('emailjs', () => ({
    SMTPClient: vi.fn().mockImplementation(() => ({ sendAsync: vi.fn().mockResolvedValue(true) })),
}));

const port = 1824;
const MIGRATION_DIRS = ['1.67.0', '1.68.0'].map((v) => join(__dirname, `../../../migrations/taskview/sql/${v}`));
const MB = 1024 * 1024;

const api: AxiosInstance = axios.create({
    baseURL: `http://localhost:${port}`,
    validateStatus: () => true,
    httpAgent: new http.Agent({ keepAlive: false }),
});

let server: http.Server;
let jwt = '';
// [owner jwt, goal ids, organization ids] - cleanup has to run as the user who owns the rows.
const cleanup: [string, number[], number[]][] = [];
function track(kind: 'goal' | 'org', id: number) {
    let entry = cleanup.find(([owner]) => owner === jwt);
    if (!entry) {
        entry = [jwt, [], []];
        cleanup.push(entry);
    }
    (kind === 'goal' ? entry[1] : entry[2]).push(id);
}
const auth = () => ({ headers: { Authorization: `Bearer ${jwt}` } });

type QuotaSettings = { mode: FileQuotaMode; organizationMb?: number };
type UploadArgs = { goalId: number; bytes: number };
type OrgQuotaArgs = { organizationId: number; quotaMb: number | null };

const savedEnv = { mode: process.env.FILE_QUOTA_MODE, organizationMb: process.env.FILE_QUOTA_ORGANIZATION_MB };

function useQuota(settings: QuotaSettings) {
    process.env.FILE_QUOTA_MODE = settings.mode;
    if (settings.organizationMb === undefined) delete process.env.FILE_QUOTA_ORGANIZATION_MB;
    else process.env.FILE_QUOTA_ORGANIZATION_MB = String(settings.organizationMb);
    FileStorageFactory.resetInstance();
}

async function createOrg(name: string): Promise<number> {
    const response = await api.post('/module/organizations', { name: `${name}-${Date.now()}` }, auth());
    expect(response.status).toBe(200);
    track('org', response.data.response.id);
    return response.data.response.id;
}

async function createGoal(organizationId: number): Promise<number> {
    const response = await api.post('/module/goals', { name: `quota-${Date.now()}`, organizationId }, auth());
    expect(response.status).toBe(200);
    track('goal', response.data.response.id);
    return response.data.response.id;
}

async function setOrgQuota(args: OrgQuotaArgs) {
    await Database.getInstance()
        .dbDrizzle.update(OrganizationsSchema)
        .set({ fileQuotaMb: args.quotaMb })
        .where(eq(OrganizationsSchema.id, args.organizationId));
}

async function upload(args: UploadArgs) {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(args.bytes)], { type: 'application/octet-stream' }), `q-${Date.now()}.bin`);
    return api.post<{ response: FileDto }>(`/module/files/goal/${args.goalId}`, form, auth());
}

async function quota(goalId: number): Promise<FileQuotaDto> {
    const response = await api.get(`/module/files/goal/${goalId}/quota`, auth());
    expect(response.status).toBe(200);
    return response.data.response;
}

async function fileIds(goalId: number): Promise<string[]> {
    const page = await api.get<{ response: FileListPage }>(`/module/files/goal/${goalId}?limit=200`, auth());
    return (page.data.response?.items ?? []).map((f) => f.id);
}

describe('Files storage quotas', () => {
    beforeAll(async () => {
        const client = await Database.getInstance().getClient();
        // Integration specs run in parallel and re-apply migration SQL; an advisory lock keeps the DDL from racing.
        await client.query('SELECT pg_advisory_lock(1401067)');
        try {
            for (const dir of MIGRATION_DIRS) {
                for (const file of (await fs.readdir(dir)).sort()) {
                    await client.query(await fs.readFile(join(dir, file), 'utf-8'));
                }
            }
        } finally {
            await client.query('SELECT pg_advisory_unlock(1401067)');
            client.release();
        }

        server = new App(port).listen();
        const login = await api.post('/module/auth/login', { login: 'test@mail.dest', password: 'user1!#Q' });
        expect(login.status).toBe(200);
        jwt = login.data.access;
    });

    afterEach(() => useQuota({ mode: 'off' }));

    afterAll(async () => {
        for (const [owner, goals, orgs] of cleanup) {
            jwt = owner;
            for (const goalId of goals) {
                for (const id of await fileIds(goalId)) await api.delete(`/module/files/file/${id}`, auth());
            }
            for (const orgId of orgs) await api.delete(`/module/organizations/${orgId}`, auth());
        }
        process.env.FILE_QUOTA_MODE = savedEnv.mode;
        process.env.FILE_QUOTA_ORGANIZATION_MB = savedEnv.organizationMb;
        if (savedEnv.mode === undefined) delete process.env.FILE_QUOTA_MODE;
        if (savedEnv.organizationMb === undefined) delete process.env.FILE_QUOTA_ORGANIZATION_MB;
        FileStorageFactory.resetInstance();
        if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    }, 30_000);

    it('reports no quota and never blocks when quotas are off', async () => {
        useQuota({ mode: 'off' });
        const org = await createOrg('quota-off');
        await setOrgQuota({ organizationId: org, quotaMb: 0 });
        const goalId = await createGoal(org);

        expect(await quota(goalId)).toEqual({ mode: 'off', quotaBytes: null, usedBytes: null });
        expect((await upload({ goalId, bytes: 1000 })).status).toBe(200);
    });

    it('enforces an organization quota mid-stream, stores nothing over it, and frees space on delete', async () => {
        useQuota({ mode: 'enforce' });
        const org = await createOrg('quota-org');
        await setOrgQuota({ organizationId: org, quotaMb: 1 });
        const goalId = await createGoal(org);

        const first = await upload({ goalId, bytes: 600_000 });
        expect(first.status).toBe(200);
        expect(await quota(goalId)).toEqual({ mode: 'enforce', quotaBytes: MB, usedBytes: 600_000 });

        const second = await upload({ goalId, bytes: 600_000 });
        expect(second.status).toBe(507);
        expect(second.data).toContain('quota exceeded');
        expect(await fileIds(goalId)).toEqual([first.data.response.id]);
        expect((await quota(goalId)).usedBytes).toBe(600_000);

        expect((await api.delete(`/module/files/file/${first.data.response.id}`, auth())).status).toBe(200);
        expect((await quota(goalId)).usedBytes).toBe(0);
        expect((await upload({ goalId, bytes: 600_000 })).status).toBe(200);
    });

    it('rejects right away when nothing is left of the quota', async () => {
        useQuota({ mode: 'enforce' });
        const org = await createOrg('quota-zero');
        await setOrgQuota({ organizationId: org, quotaMb: 0 });
        const goalId = await createGoal(org);

        const response = await upload({ goalId, bytes: 1000 });
        expect(response.status).toBe(507);
        expect(await fileIds(goalId)).toEqual([]);
    });

    it('gives every organization the default quota of its own, independent of other organizations', async () => {
        useQuota({ mode: 'enforce', organizationMb: 1 });
        const goalA = await createGoal(await createOrg('default-a'));
        const goalB = await createGoal(await createOrg('default-b'));

        expect(await quota(goalA)).toEqual({ mode: 'enforce', quotaBytes: MB, usedBytes: 0 });

        expect((await upload({ goalId: goalA, bytes: 600_000 })).status).toBe(200);
        expect((await upload({ goalId: goalB, bytes: 600_000 })).status).toBe(200);
        expect((await quota(goalA)).usedBytes).toBe(600_000);
        expect((await quota(goalB)).usedBytes).toBe(600_000);

        expect((await upload({ goalId: goalA, bytes: 600_000 })).status).toBe(507);
    });

    it('uses the organization column instead of the default when it is set', async () => {
        useQuota({ mode: 'enforce', organizationMb: 1 });
        const org = await createOrg('custom');
        await setOrgQuota({ organizationId: org, quotaMb: 3 });
        const goalId = await createGoal(org);

        expect((await quota(goalId)).quotaBytes).toBe(3 * MB);
        expect((await upload({ goalId, bytes: 600_000 })).status).toBe(200);
        expect((await upload({ goalId, bytes: 600_000 })).status).toBe(200);
    });

    it('never exceeds the quota when uploads into one organization run in parallel', async () => {
        useQuota({ mode: 'enforce' });
        const org = await createOrg('quota-parallel');
        await setOrgQuota({ organizationId: org, quotaMb: 1 });
        const goalId = await createGoal(org);

        // Whichever way the race goes (cut while streaming or refused at the locked final check), one upload must lose.
        const results = await Promise.all([upload({ goalId, bytes: 600_000 }), upload({ goalId, bytes: 600_000 })]);

        expect(results.map((r) => r.status).sort()).toEqual([200, 507]);
        expect(await fileIds(goalId)).toHaveLength(1);
        expect((await quota(goalId)).usedBytes).toBe(600_000);
    });
    it('lets only one of two concurrent records into an organization through when both would not fit', async () => {
        const org = await createOrg('quota-lock');
        const goalId = await createGoal(org);
        const repository = new FilesRepository();
        const row = (): FileInsertArgs => {
            const id = crypto.randomUUID();
            return {
                id,
                goalId,
                uploaderId: null,
                uploaderEmail: 'test@mail.dest',
                name: `${id}.bin`,
                originalName: `${id}.bin`,
                mimeType: 'application/octet-stream',
                sizeBytes: 600_000,
                checksumSha256: '0'.repeat(64),
                storageProvider: 'local',
                storageKey: `${goalId}/${id}`,
            };
        };

        // Both transactions start before either commits; without the organization row lock both would see 0 used.
        const results = await Promise.all([
            repository.insertWithinQuota({ row: row(), organizationId: org, quotaBytes: MB }),
            repository.insertWithinQuota({ row: row(), organizationId: org, quotaBytes: MB }),
        ]);

        const inserted = results.filter((r) => r !== null);
        expect(inserted).toHaveLength(1);
        expect(results.filter((r) => r === null)).toHaveLength(1);
        for (const file of inserted) if (file) await repository.delete(file.id);
    });
});
