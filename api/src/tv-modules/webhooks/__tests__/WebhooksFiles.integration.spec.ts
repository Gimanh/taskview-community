import axios, { type AxiosInstance } from 'axios';
import fs from 'fs/promises';
import http from 'http';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import App from '../../../App';
import { Database } from '../../../modules/db';
import { FILE_EVENTS, FileEvents, type FileDto, type FileEventPayload } from '../../files/types';
import { WebhooksRepository } from '../WebhooksRepository';

vi.mock('emailjs', () => ({
    SMTPClient: vi.fn().mockImplementation(() => ({ sendAsync: vi.fn().mockResolvedValue(true) })),
}));

const port = 1825;
const FILES_MIGRATION_DIR = join(__dirname, '../../../migrations/taskview/sql/1.67.0');

const api: AxiosInstance = axios.create({
    baseURL: `http://localhost:${port}`,
    validateStatus: () => true,
    httpAgent: new http.Agent({ keepAlive: false }),
});

type DeliveryPayload = FileEventPayload & { event: string; timestamp: string };

let server: http.Server;
let jwt = '';
let goalId = 0;
let taskId = 0;
let otherTaskId = 0;
let webhookId = 0;
const savedAllowPrivate = process.env.WEBHOOKS_ALLOW_PRIVATE_URLS;
const auth = () => ({ headers: { Authorization: `Bearer ${jwt}` } });

async function createTask(description: string): Promise<number> {
    const response = await api.post('/module/tasks', { goalId, description }, auth());
    expect(response.status).toBe(200);
    return response.data.response.id;
}

// Deliveries are written by an async event listener; wait until the expected number shows up
async function fileDeliveries(expected: number): Promise<DeliveryPayload[]> {
    const repository = new WebhooksRepository();
    for (let attempt = 0; attempt < 50; attempt++) {
        const rows = await repository.fetchDeliveries(webhookId, { limit: 50 });
        if (rows.length >= expected) {
            return rows
                .sort((a, b) => a.id - b.id)
                .map((row) => row.payload as DeliveryPayload);
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Expected ${expected} webhook deliveries`);
}

describe('Webhooks: file events', () => {
    beforeAll(async () => {
        const client = await Database.getInstance().getClient();
        await client.query('SELECT pg_advisory_lock(1401067)');
        try {
            for (const file of (await fs.readdir(FILES_MIGRATION_DIR)).sort()) {
                await client.query(await fs.readFile(join(FILES_MIGRATION_DIR, file), 'utf-8'));
            }
        } finally {
            await client.query('SELECT pg_advisory_unlock(1401067)');
            client.release();
        }

        // The receiver URL is never reached in this test; only the recorded deliveries are checked
        process.env.WEBHOOKS_ALLOW_PRIVATE_URLS = 'true';
        server = new App(port).listen();

        const login = await api.post('/module/auth/login', { login: 'test@mail.dest', password: 'user1!#Q' });
        expect(login.status).toBe(200);
        jwt = login.data.access;

        const goal = await api.post('/module/goals', { name: `webhook-files-${Date.now()}` }, auth());
        expect(goal.status).toBe(200);
        goalId = goal.data.response.id;
        taskId = await createTask('task with a file');
        otherTaskId = await createTask('another task');

        const webhook = await api.post('/module/webhooks', { goalId, url: 'http://127.0.0.1:9/hook', events: [...FILE_EVENTS] }, auth());
        expect(webhook.status).toBe(200);
        webhookId = webhook.data.response.webhook.id;
    });

    afterAll(async () => {
        if (webhookId) await api.delete('/module/webhooks', { ...auth(), data: { id: webhookId } });
        if (goalId) await api.delete('/module/goals', { ...auth(), data: { goalId } });
        if (savedAllowPrivate === undefined) delete process.env.WEBHOOKS_ALLOW_PRIVATE_URLS;
        else process.env.WEBHOOKS_ALLOW_PRIVATE_URLS = savedAllowPrivate;
        if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    }, 30_000);

    it('delivers upload, rename, attach, detach and delete with the file metadata and no download link', async () => {
        const form = new FormData();
        form.append('file', new Blob(['webhook file'], { type: 'text/plain' }), 'report.txt');
        const uploaded = await api.post<{ response: FileDto }>(`/module/files/goal/${goalId}?taskId=${taskId}`, form, auth());
        expect(uploaded.status).toBe(200);
        const fileId = uploaded.data.response.id;

        expect((await api.patch(`/module/files/file/${fileId}`, { name: 'final' }, auth())).status).toBe(200);
        expect((await api.post(`/module/files/task/${otherTaskId}/link`, { fileIds: [fileId] }, auth())).status).toBe(200);
        expect((await api.delete(`/module/files/task/${taskId}/file/${fileId}`, auth())).status).toBe(200);
        expect((await api.delete(`/module/files/file/${fileId}`, auth())).status).toBe(200);

        const payloads = await fileDeliveries(5);
        expect(payloads.map((p) => p.event)).toEqual([
            FileEvents.Uploaded,
            FileEvents.Renamed,
            FileEvents.Attached,
            FileEvents.Detached,
            FileEvents.Deleted,
        ]);

        const [upload, rename, attach, detach, remove] = payloads;
        expect(upload).toMatchObject({ goalId, taskIds: [taskId], file: { id: fileId, name: 'report.txt', mimeType: 'text/plain', linkedTaskIds: [taskId] } });
        expect(rename).toMatchObject({ taskIds: [taskId], file: { id: fileId, name: 'final.txt' } });
        expect(attach.taskIds).toEqual([otherTaskId]);
        expect([...attach.file.linkedTaskIds].sort()).toEqual([taskId, otherTaskId].sort());
        expect(detach).toMatchObject({ taskIds: [taskId], file: { linkedTaskIds: [otherTaskId] } });
        expect(remove).toMatchObject({ taskIds: [otherTaskId], file: { id: fileId, name: 'final.txt' } });

        for (const payload of payloads) {
            expect(typeof payload.initiatorId).toBe('number');
            expect(payload.timestamp).toBeTruthy();
            const raw = JSON.stringify(payload);
            expect(raw).not.toContain('/module/files/content/');
            expect(raw).not.toContain('storageKey');
        }
    });
});
