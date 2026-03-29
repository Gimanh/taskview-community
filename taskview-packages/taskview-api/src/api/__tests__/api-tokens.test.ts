import { TvApi } from '@/tv';
import {
    describe,
    it,
    expect,
    beforeAll,
    afterAll,
} from 'vitest';
import { initApi, API_URL } from './init-api';
import axios from 'axios';
import type { ApiTokenItem } from '../api-tokens.types';
import { ALL_TASKS_LIST_ID } from '../tasks.api.types';

describe('API Tokens', () => {
    let $api: TvApi;
    let goalId: number;
    let goalId2: number;

    beforeAll(async () => {
        const { $tvApi } = await initApi();
        $api = $tvApi;

        const goal = await $api.goals.createGoal({
            name: `Token test project-${Date.now()}`,
        });
        goalId = goal!.id!;

        const goal2 = await $api.goals.createGoal({
            name: `Token test project 2-${Date.now()}`,
        });
        goalId2 = goal2!.id!;
    });

    afterAll(async () => {
        await $api.goals.deleteGoal(goalId).catch(() => {});
        await $api.goals.deleteGoal(goalId2).catch(() => {});
    });

    describe('CRUD', () => {
        it('should create a token and return plaintext once', async () => {
            const result = await $api.apiTokens.create({
                name: 'Test token',
            });

            expect(result).toBeDefined();
            expect(result!.token).toMatch(/^tvk_/);
            expect(result!.token.length).toBe(68); // tvk_ + 64 hex
            expect(result!.item.name).toBe('Test token');
            expect(result!.item.allowedPermissions).toEqual([]);
            expect(result!.item.allowedGoalIds).toEqual([]);

            // cleanup
            await $api.apiTokens.delete(result!.item.id);
        });

        it('should list tokens without tokenHash', async () => {
            const created = await $api.apiTokens.create({ name: 'List test' });
            const tokens = await $api.apiTokens.fetch();

            expect(tokens).toBeDefined();
            expect(tokens!.length).toBeGreaterThanOrEqual(1);

            const found = tokens!.find((t: ApiTokenItem) => t.id === created!.item.id);
            expect(found).toBeDefined();
            expect(found!.name).toBe('List test');
            expect((found as any).tokenHash).toBeUndefined();

            await $api.apiTokens.delete(created!.item.id);
        });

        it('should delete a token', async () => {
            const created = await $api.apiTokens.create({ name: 'Delete test' });
            const deleteResult = await $api.apiTokens.delete(created!.item.id);
            expect(deleteResult).toBe(true);

            const tokens = await $api.apiTokens.fetch();
            expect(tokens!.find((t: ApiTokenItem) => t.id === created!.item.id)).toBeUndefined();
        });

        it('should fetch available permissions', async () => {
            const permissions = await $api.apiTokens.fetchPermissions();
            expect(permissions).toBeDefined();
            expect(permissions!.length).toBeGreaterThan(0);
            expect(permissions![0]).toHaveProperty('id');
            expect(permissions![0]).toHaveProperty('name');
            expect(permissions![0]).toHaveProperty('permissionGroup');
        });
    });

    describe('Authentication via API token', () => {
        it('should authenticate and perform requests with full-access token', async () => {
            const created = await $api.apiTokens.create({ name: 'Auth test' });
            const tokenApi = new TvApi(axios.create({
                baseURL: API_URL,
                headers: { Authorization: `Bearer ${created!.token}` },
            }));

            // Create task
            const task = await tokenApi.tasks.createTask({
                goalId,
                description: `Token task-${Date.now()}`,
            });
            expect(task).toBeDefined();
            expect(task!.id).toBeGreaterThan(0);
            expect(task!.description).toBeTruthy();

            // Update task
            const updated = await tokenApi.tasks.updateTask({
                id: task!.id,
                description: 'Updated by token',
            });
            expect(updated).toBeDefined();
            expect(updated!.description).toBe('Updated by token');

            // Delete task
            const deleted = await tokenApi.tasks.deleteTask(task!.id);
            expect(deleted!.delete).toBe(true);

            await $api.apiTokens.delete(created!.item.id);
        });

        it('should return 401 for invalid token', async () => {
            const tokenApi = new TvApi(axios.create({
                baseURL: API_URL,
                headers: { Authorization: 'Bearer tvk_invalidtoken000000000000000000000000000000000000000000000000' },
            }));

            const status = await tokenApi.goals.fetchGoals().catch((err) => err.status);
            expect(status).toBe(401);
        });
    });

    describe('Permission scoping', () => {
        it('should deny task creation when token lacks component_can_add_tasks', async () => {
            const created = await $api.apiTokens.create({
                name: 'Read-only token',
                allowedPermissions: ['component_can_watch_content'],
            });

            const tokenApi = new TvApi(axios.create({
                baseURL: API_URL,
                headers: { Authorization: `Bearer ${created!.token}` },
            }));

            const status = await tokenApi.tasks.createTask({
                goalId,
                description: 'Should fail',
            }).catch((err) => err.status);

            expect(status).toBe(403);

            await $api.apiTokens.delete(created!.item.id);
        });

        it('should allow reading tasks with component_can_watch_content', async () => {
            // Create task with full API first
            const task = await $api.tasks.createTask({
                goalId,
                description: `Readable task-${Date.now()}`,
            });

            const created = await $api.apiTokens.create({
                name: 'Read token',
                allowedPermissions: ['component_can_watch_content'],
            });

            const tokenApi = new TvApi(axios.create({
                baseURL: API_URL,
                headers: { Authorization: `Bearer ${created!.token}` },
            }));

            const tasks = await tokenApi.tasks.fetch({
                goalId,
                page: 0,
                showCompleted: 0,
                firstNew: 0,
                componentId: ALL_TASKS_LIST_ID,
            });

            expect(tasks).toBeDefined();
            expect(tasks!.length).toBeGreaterThanOrEqual(1);
            expect(tasks!.some(t => t.id === task!.id)).toBe(true);

            await $api.tasks.deleteTask(task!.id);
            await $api.apiTokens.delete(created!.item.id);
        });

        it('should deny task deletion without task_can_delete', async () => {
            const task = await $api.tasks.createTask({
                goalId,
                description: `Undeletable-${Date.now()}`,
            });

            const created = await $api.apiTokens.create({
                name: 'No delete token',
                allowedPermissions: ['component_can_watch_content', 'component_can_add_tasks'],
            });

            const tokenApi = new TvApi(axios.create({
                baseURL: API_URL,
                headers: { Authorization: `Bearer ${created!.token}` },
            }));

            const status = await tokenApi.tasks.deleteTask(task!.id).catch((err) => err.status);
            expect(status).toBe(403);

            await $api.tasks.deleteTask(task!.id);
            await $api.apiTokens.delete(created!.item.id);
        });

        it('should allow task deletion when token has task_can_delete', async () => {
            const task = await $api.tasks.createTask({
                goalId,
                description: `Deletable-${Date.now()}`,
            });

            const created = await $api.apiTokens.create({
                name: 'Delete token',
                allowedPermissions: ['component_can_watch_content', 'task_can_delete'],
            });

            const tokenApi = new TvApi(axios.create({
                baseURL: API_URL,
                headers: { Authorization: `Bearer ${created!.token}` },
            }));

            const deleted = await tokenApi.tasks.deleteTask(task!.id);
            expect(deleted!.delete).toBe(true);

            await $api.apiTokens.delete(created!.item.id);
        });

        it('should allow task creation only with component_can_add_tasks and see description with component_can_watch_content', async () => {
            const created = await $api.apiTokens.create({
                name: 'Create and read token',
                allowedPermissions: ['component_can_add_tasks', 'component_can_watch_content', 'task_can_edit_description'],
            });

            const tokenApi = new TvApi(axios.create({
                baseURL: API_URL,
                headers: { Authorization: `Bearer ${created!.token}` },
            }));

            const task = await tokenApi.tasks.createTask({
                goalId,
                description: `Created with scoped token-${Date.now()}`,
            });

            expect(task).toBeDefined();
            expect(task!.description).toBeTruthy();
            expect(task!.description).toContain('Created with scoped token');

            await $api.tasks.deleteTask(task!.id);
            await $api.apiTokens.delete(created!.item.id);
        });

        it('should hide description when token lacks component_can_watch_content', async () => {
            const created = await $api.apiTokens.create({
                name: 'No watch token',
                allowedPermissions: ['component_can_add_tasks'],
            });

            const tokenApi = new TvApi(axios.create({
                baseURL: API_URL,
                headers: { Authorization: `Bearer ${created!.token}` },
            }));

            const task = await tokenApi.tasks.createTask({
                goalId,
                description: `Hidden description-${Date.now()}`,
            });

            expect(task).toBeDefined();
            expect(task!.description).toBeNull();

            await $api.tasks.deleteTask(task!.id);
            await $api.apiTokens.delete(created!.item.id);
        });

        it('should allow update only with task_can_edit_description', async () => {
            const task = await $api.tasks.createTask({
                goalId,
                description: `Original-${Date.now()}`,
            });

            const created = await $api.apiTokens.create({
                name: 'Edit only token',
                allowedPermissions: ['component_can_watch_content', 'task_can_edit_description'],
            });

            const tokenApi = new TvApi(axios.create({
                baseURL: API_URL,
                headers: { Authorization: `Bearer ${created!.token}` },
            }));

            const updated = await tokenApi.tasks.updateTask({
                id: task!.id,
                description: 'Updated by scoped token',
            });

            expect(updated).toBeDefined();
            expect(updated!.description).toBe('Updated by scoped token');

            // Should not be able to delete
            const status = await tokenApi.tasks.deleteTask(task!.id).catch((err) => err.status);
            expect(status).toBe(403);

            await $api.tasks.deleteTask(task!.id);
            await $api.apiTokens.delete(created!.item.id);
        });
    });

    describe('Goal scoping', () => {
        it('should allow access to allowed goal', async () => {
            const created = await $api.apiTokens.create({
                name: 'Goal scoped token',
                allowedGoalIds: [goalId],
            });

            const tokenApi = new TvApi(axios.create({
                baseURL: API_URL,
                headers: { Authorization: `Bearer ${created!.token}` },
            }));

            const task = await tokenApi.tasks.createTask({
                goalId,
                description: `Allowed goal task-${Date.now()}`,
            });
            expect(task).toBeDefined();
            expect(task!.id).toBeGreaterThan(0);

            await tokenApi.tasks.deleteTask(task!.id);
            await $api.apiTokens.delete(created!.item.id);
        });

        it('should deny access to non-allowed goal', async () => {
            const created = await $api.apiTokens.create({
                name: 'Goal restricted token',
                allowedGoalIds: [goalId],
            });

            const tokenApi = new TvApi(axios.create({
                baseURL: API_URL,
                headers: { Authorization: `Bearer ${created!.token}` },
            }));

            const status = await tokenApi.tasks.createTask({
                goalId: goalId2,
                description: 'Should fail',
            }).catch((err) => err.status);

            expect(status).toBe(403);

            await $api.apiTokens.delete(created!.item.id);
        });

        it('should allow all goals when allowedGoalIds is empty', async () => {
            const created = await $api.apiTokens.create({
                name: 'All goals token',
                allowedGoalIds: [],
            });

            const tokenApi = new TvApi(axios.create({
                baseURL: API_URL,
                headers: { Authorization: `Bearer ${created!.token}` },
            }));

            const task1 = await tokenApi.tasks.createTask({
                goalId,
                description: `Goal1 task-${Date.now()}`,
            });
            expect(task1).toBeDefined();

            const task2 = await tokenApi.tasks.createTask({
                goalId: goalId2,
                description: `Goal2 task-${Date.now()}`,
            });
            expect(task2).toBeDefined();

            await tokenApi.tasks.deleteTask(task1!.id);
            await tokenApi.tasks.deleteTask(task2!.id);
            await $api.apiTokens.delete(created!.item.id);
        });
    });

    describe('Expiration', () => {
        it('should reject expired token', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);

            const created = await $api.apiTokens.create({
                name: 'Expired token',
                expiresAt: pastDate.toISOString(),
            });

            const tokenApi = new TvApi(axios.create({
                baseURL: API_URL,
                headers: { Authorization: `Bearer ${created!.token}` },
            }));

            const status = await tokenApi.goals.fetchGoals().catch((err) => err.status);
            expect(status).toBe(401);

            await $api.apiTokens.delete(created!.item.id);
        });
    });

    describe('Security', () => {
        it('should not allow creating tokens via API token', async () => {
            const created = await $api.apiTokens.create({ name: 'Bootstrap token' });

            const tokenApi = new TvApi(axios.create({
                baseURL: API_URL,
                headers: { Authorization: `Bearer ${created!.token}` },
            }));

            const status = await tokenApi.apiTokens.create({
                name: 'Should fail',
            }).catch((err) => err.status);

            expect(status).toBe(403);

            await $api.apiTokens.delete(created!.item.id);
        });

        it('should not allow listing tokens via API token', async () => {
            const created = await $api.apiTokens.create({ name: 'List attempt' });

            const tokenApi = new TvApi(axios.create({
                baseURL: API_URL,
                headers: { Authorization: `Bearer ${created!.token}` },
            }));

            const status = await tokenApi.apiTokens.fetch().catch((err) => err.status);
            expect(status).toBe(403);

            await $api.apiTokens.delete(created!.item.id);
        });

        it('should not allow deleting tokens via API token', async () => {
            const created = await $api.apiTokens.create({ name: 'Delete attempt' });

            const tokenApi = new TvApi(axios.create({
                baseURL: API_URL,
                headers: { Authorization: `Bearer ${created!.token}` },
            }));

            const status = await tokenApi.apiTokens.delete(created!.item.id).catch((err) => err.status);
            expect(status).toBe(403);

            await $api.apiTokens.delete(created!.item.id);
        });
    });
});
