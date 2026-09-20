import axios, { type AxiosInstance } from 'axios';
import http from 'http';
import { Database } from '../../../modules/db';
import { encrypt } from '../../../utils/crypto';
import type { IntegrationProvider } from '../types';

export const TEST_LOGIN = 'test@mail.dest';
export const TEST_PASSWORD = 'user1!#Q';

export type InsertIntegrationArgs = {
    provider: IntegrationProvider;
    projectId: number;
    repoFullName?: string | null;
    repoExternalId?: string | null;
    accessToken?: string | null;
    refreshToken?: string | null;
    webhookSecret?: string | null;
    isActive?: boolean;
};

export type TaskRow = { id: number; description: string; note: string | null; complete: boolean; kanban_order: number; source_url: string | null };
export type MappingRow = { id: number; task_id: number; issue_number: number; issue_state: string };
export type IntegrationRow = {
    id: number; provider: string; access_token_encrypted: string | null; refresh_token_encrypted: string | null;
    repo_full_name: string | null; last_synced_at: Date | null;
};

export function createApi(port: number): AxiosInstance {
    return axios.create({
        baseURL: `http://localhost:${port}`,
        validateStatus: () => true,
        maxRedirects: 0,
        httpAgent: new http.Agent({ keepAlive: false }),
    });
}

export async function loginAndCreateGoal(api: AxiosInstance, name: string): Promise<{ jwt: string; goalId: number }> {
    const login = await api.post('/module/auth/login', { login: TEST_LOGIN, password: TEST_PASSWORD });
    if (login.status !== 200) throw new Error(`login failed: ${login.status}`);
    const jwt = login.data.access as string;

    const goal = await api.post('/module/goals', { name }, { headers: { Authorization: `Bearer ${jwt}` } });
    if (goal.status !== 200) throw new Error(`goal creation failed: ${goal.status}`);
    const goalId = (goal.data.response.id ?? goal.data.response.goal?.id) as number;
    return { jwt, goalId };
}

export async function cleanupGoal(api: AxiosInstance, jwt: string, goalId: number): Promise<void> {
    const db = Database.getInstance();
    // Integrations cascade to their mappings; tasks have no FK to the goal, so
    // the rows a sync or webhook created are removed explicitly.
    await db.query('DELETE FROM tasks.integrations WHERE project_id = $1', [goalId]);
    await db.query('DELETE FROM tasks.tasks WHERE goal_id = $1', [goalId]);
    await api.delete('/module/goals', { headers: { Authorization: `Bearer ${jwt}` }, data: { goalId } });
}

export async function insertIntegration(args: InsertIntegrationArgs): Promise<number> {
    const db = Database.getInstance();
    const result = await db.query<{ id: number }>(
        `INSERT INTO tasks.integrations
            (provider, project_id, repo_full_name, repo_external_id, access_token_encrypted, refresh_token_encrypted, webhook_secret_encrypted, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
            args.provider,
            args.projectId,
            args.repoFullName ?? null,
            args.repoExternalId ?? null,
            args.accessToken ? encrypt(args.accessToken) : null,
            args.refreshToken ? encrypt(args.refreshToken) : null,
            args.webhookSecret ? encrypt(args.webhookSecret) : null,
            args.isActive ?? true,
        ],
    );
    return result.rows[0].id;
}

export async function tasksOfGoal(goalId: number): Promise<TaskRow[]> {
    const db = Database.getInstance();
    const result = await db.query<TaskRow>(
        'SELECT id, description, note, complete, kanban_order, source_url FROM tasks.tasks WHERE goal_id = $1 ORDER BY id',
        [goalId],
    );
    return result.rows;
}

export async function mappingsOf(integrationId: number): Promise<MappingRow[]> {
    const db = Database.getInstance();
    const result = await db.query<MappingRow>(
        'SELECT id, task_id, issue_number, issue_state FROM tasks.integration_task_map WHERE integration_id = $1 ORDER BY issue_number',
        [integrationId],
    );
    return result.rows;
}

export async function integrationsOfGoal(goalId: number): Promise<IntegrationRow[]> {
    const db = Database.getInstance();
    const result = await db.query<IntegrationRow>(
        'SELECT id, provider, access_token_encrypted, refresh_token_encrypted, repo_full_name, last_synced_at FROM tasks.integrations WHERE project_id = $1 ORDER BY id',
        [goalId],
    );
    return result.rows;
}
