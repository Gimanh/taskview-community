// cspell:ignore TIMETRACKING
import { TvApi } from '@/tv';
import {
    describe,
    it,
    expect,
    beforeAll,
    beforeEach,
} from 'vitest';
import axios from 'axios';
import { initApi, API_URL } from './init-api';
import { TvPermissions } from '../permissions';
import type { CollaborationPermission } from '../collaboration.types';
import type { TimeEntryItem } from '../time-tracking.types';

const isoMinutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const isoMinutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

describe('TvApi time-tracking tests', () => {
    let $mainUser: TvApi;
    let $invitedUser: TvApi;
    let mainUserEmail: string;
    let invitedUserEmail: string;

    let organizationId: number;
    let goalId: number;
    let secondaryGoalId: number;
    let foreignGoalId: number;
    let taskId: number;
    let secondaryTaskId: number;
    let foreignTaskId: number;
    let foreignOrgId: number;

    let timestamp: number;
    let permissions: CollaborationPermission[] = [];

    const findPermissionId = async (api: TvApi, permission: typeof TvPermissions[keyof typeof TvPermissions]) => {
        if (!permissions.length) {
            permissions = await api.collaboration.fetchAllPermissions();
        }
        const id = permissions.find((p) => p.name === permission)?.id;
        if (!id) throw new Error(`Permission ${permission} not found`);
        return id;
    };

    const togglePermissionForRole = async (roleId: number, permission: typeof TvPermissions[keyof typeof TvPermissions]) => {
        const permissionId = await findPermissionId($mainUser, permission);
        const response = await $mainUser.collaboration.toggleRolePermission({
            roleId,
            permissionId,
        }).catch(console.error);
        if (!response) throw new Error(`Failed to toggle permission ${permission}`);
        return response.add;
    };

    const inviteUserToGoalWithRole = async (
        targetGoalId: number,
        targetRoleName: string,
        targetPermissions: (typeof TvPermissions[keyof typeof TvPermissions])[],
    ) => {
        const role = await $mainUser.collaboration.createRoleForGoal({
            goalId: targetGoalId,
            roleName: targetRoleName,
        }).catch(console.error);
        if (!role) throw new Error('Failed to create role');

        const added = await $mainUser.collaboration.inviteUserToGoal({
            goalId: targetGoalId,
            email: invitedUserEmail,
        }).catch(console.error);
        if (!added) throw new Error('Failed to invite user');

        await $mainUser.collaboration.toggleUserRoles({
            goalId: targetGoalId,
            userId: added.id,
            roles: [role.id],
        }).catch(console.error);

        for (const perm of targetPermissions) {
            await togglePermissionForRole(role.id, perm);
        }

        return { roleId: role.id, invitedRecordId: added.id };
    };

    const stopActiveIfAny = async (api: TvApi) => {
        const active = await api.timeTracking.getActive().catch(() => null);
        if (active) {
            await api.timeTracking.stop({ entryId: active.id }).catch(() => null);
        }
    };

    beforeAll(async () => {
        const init = await initApi();
        $mainUser = init.$tvApi;
        $invitedUser = init.$tvApiForSecondUser;
        mainUserEmail = init.user1Email;
        invitedUserEmail = init.user2Email;
    });

    beforeEach(async () => {
        timestamp = Date.now();
        permissions = [];

        await stopActiveIfAny($mainUser);
        await stopActiveIfAny($invitedUser);

        const org = await $mainUser.organizations.create({
            name: `TT Org-${timestamp}`,
        }).catch(console.error);
        if (!org) throw new Error('Failed to create organization');
        organizationId = org.id;

        const goal = await $mainUser.goals.createGoal({
            name: `TT Goal-${timestamp}`,
            organizationId,
        }).catch(console.error);
        if (!goal) throw new Error('Failed to create primary goal');
        goalId = goal.id;

        const secondaryGoal = await $mainUser.goals.createGoal({
            name: `TT Goal2-${timestamp}`,
            organizationId,
        }).catch(console.error);
        if (!secondaryGoal) throw new Error('Failed to create secondary goal');
        secondaryGoalId = secondaryGoal.id;

        const foreignOrg = await $invitedUser.organizations.create({
            name: `TT Foreign Org-${timestamp}`,
        }).catch(console.error);
        if (!foreignOrg) throw new Error('Failed to create foreign organization');
        foreignOrgId = foreignOrg.id;

        const foreignGoal = await $invitedUser.goals.createGoal({
            name: `TT Foreign Goal-${timestamp}`,
            organizationId: foreignOrgId,
        }).catch(console.error);
        if (!foreignGoal) throw new Error('Failed to create foreign goal');
        foreignGoalId = foreignGoal.id;

        const task = await $mainUser.tasks.createTask({
            goalId,
            description: `TT task-${timestamp}`,
        }).catch(console.error);
        if (!task) throw new Error('Failed to create task');
        taskId = task.id;

        const secondaryTask = await $mainUser.tasks.createTask({
            goalId,
            description: `TT secondary task-${timestamp}`,
        }).catch(console.error);
        if (!secondaryTask) throw new Error('Failed to create secondary task');
        secondaryTaskId = secondaryTask.id;

        const foreignTask = await $invitedUser.tasks.createTask({
            goalId: foreignGoalId,
            description: `TT foreign task-${timestamp}`,
        }).catch(console.error);
        if (!foreignTask) throw new Error('Failed to create foreign task');
        foreignTaskId = foreignTask.id;

    });

    describe('1. Owner basic CRUD', () => {
        it('starts and stops a timer; getActive reflects state', async () => {
            const started = await $mainUser.timeTracking.start({ taskId }).catch(console.error);
            expect(started).toBeDefined();
            expect(started?.entry).toBeDefined();
            expect(started?.entry.taskId).toBe(taskId);
            expect(started?.entry.endedAt).toBeNull();
            expect(started?.autoStoppedEntry).toBeNull();

            const active = await $mainUser.timeTracking.getActive().catch(console.error);
            expect(active?.id).toBe(started?.entry.id);

            const stopped = await $mainUser.timeTracking.stop({ entryId: started?.entry.id }).catch(console.error);
            expect(stopped?.endedAt).not.toBeNull();
            expect(stopped?.durationSeconds).toBeGreaterThanOrEqual(0);

            const activeAfter = await $mainUser.timeTracking.getActive().catch(console.error);
            expect(activeAfter).toBeNull();
        });

        it('auto-stops previous active timer on start of a new one', async () => {
            const first = await $mainUser.timeTracking.start({ taskId }).catch(console.error);
            expect(first?.entry).toBeDefined();

            const second = await $mainUser.timeTracking.start({ taskId: secondaryTaskId }).catch(console.error);
            expect(second?.entry).toBeDefined();
            expect(second?.autoStoppedEntry).not.toBeNull();
            expect(second?.autoStoppedEntry?.id).toBe(first?.entry.id);
            expect(second?.autoStoppedEntry?.endedAt).not.toBeNull();

            await $mainUser.timeTracking.stop({ entryId: second?.entry.id }).catch(() => null);
        });

        it('starting a new timer on the same task auto-stops the previous one', async () => {
            const first = await $mainUser.timeTracking.start({ taskId }).catch(console.error);
            expect(first?.entry).toBeDefined();

            const second = await $mainUser.timeTracking.start({ taskId }).catch(console.error);
            expect(second?.entry).toBeDefined();
            expect(second?.entry.id).not.toBe(first?.entry.id);
            expect(second?.autoStoppedEntry).not.toBeNull();
            expect(second?.autoStoppedEntry?.id).toBe(first?.entry.id);

            await $mainUser.timeTracking.stop({ entryId: second?.entry.id }).catch(() => null);
        });

        it('stop without entryId stops the user own active timer', async () => {
            const started = await $mainUser.timeTracking.start({ taskId }).catch(console.error);
            expect(started?.entry).toBeDefined();

            const stopped = await $mainUser.timeTracking.stop().catch(console.error);
            expect(stopped?.id).toBe(started?.entry.id);
            expect(stopped?.endedAt).not.toBeNull();
        });

        it('createManual creates a manual entry that is visible in fetchEntries by goalId', async () => {
            const startedAt = isoMinutesAgo(60);
            const endedAt = isoMinutesAgo(30);

            const entry = await $mainUser.timeTracking.createManual({
                taskId,
                startedAt,
                endedAt,
                description: 'manual entry',
                billable: true,
            }).catch(console.error);
            expect(entry?.taskId).toBe(taskId);
            expect(entry?.source).toBe(1);
            expect(entry?.durationSeconds).toBe(30 * 60);

            const entries = await $mainUser.timeTracking.fetchEntries({ goalId }).catch(console.error);
            expect(entries?.some((e) => e.id === entry?.id)).toBe(true);
        });

        it('createManual with endedAt <= startedAt is rejected', async () => {
            const startedAt = isoMinutesAgo(30);
            const endedAt = isoMinutesAgo(60);

            const status = await $mainUser.timeTracking.createManual({
                taskId,
                startedAt,
                endedAt,
            }).catch((err) => err.status);
            expect(status).toBe(400);
        });

        it('update of active timer allows description only; other fields rejected', async () => {
            const started = await $mainUser.timeTracking.start({ taskId }).catch(console.error);
            expect(started?.entry).toBeDefined();

            const descUpdated = await $mainUser.timeTracking.update({
                id: started!.entry.id,
                description: 'updated description',
            }).catch(console.error);
            expect(descUpdated?.description).toBe('updated description');
            expect(descUpdated?.endedAt).toBeNull();

            const startedAtStatus = await $mainUser.timeTracking.update({
                id: started!.entry.id,
                startedAt: isoMinutesAgo(120),
            }).catch((err) => err.status);
            expect(startedAtStatus).toBe(403);

            const endedAtStatus = await $mainUser.timeTracking.update({
                id: started!.entry.id,
                endedAt: isoMinutesFromNow(1),
            }).catch((err) => err.status);
            expect(endedAtStatus).toBe(403);

            const billableStatus = await $mainUser.timeTracking.update({
                id: started!.entry.id,
                billable: false,
            }).catch((err) => err.status);
            expect(billableStatus).toBe(403);

            await $mainUser.timeTracking.stop({ entryId: started?.entry.id }).catch(() => null);
        });

        it('update of completed entry adjusts startedAt/endedAt and recalculates durationSeconds', async () => {
            const entry = await $mainUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
            }).catch(console.error);
            expect(entry).toBeDefined();

            const newStart = isoMinutesAgo(90);
            const newEnd = isoMinutesAgo(30);
            const updated = await $mainUser.timeTracking.update({
                id: entry!.id,
                startedAt: newStart,
                endedAt: newEnd,
            }).catch(console.error);
            expect(updated).toBeDefined();
            expect(updated?.durationSeconds).toBe(60 * 60);
        });

        it('update of completed entry with endedAt <= startedAt is rejected', async () => {
            const entry = await $mainUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
            }).catch(console.error);
            expect(entry).toBeDefined();

            const status = await $mainUser.timeTracking.update({
                id: entry!.id,
                startedAt: isoMinutesAgo(10),
                endedAt: isoMinutesAgo(20),
            }).catch((err) => err.status);
            expect(status).toBe(403);
        });

        it('delete removes own entry', async () => {
            const entry = await $mainUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
            }).catch(console.error);
            expect(entry).toBeDefined();

            const result = await $mainUser.timeTracking.delete(entry!.id).catch(console.error);
            expect(result?.deleted).toBe(true);

            const entries = await $mainUser.timeTracking.fetchEntries({ goalId }).catch(console.error);
            expect(entries?.some((e) => e.id === entry!.id)).toBe(false);
        });

        it('fetchHistory returns history items after edits', async () => {
            const entry = await $mainUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
                description: 'first',
            }).catch(console.error);

            await $mainUser.timeTracking.update({
                id: entry!.id,
                description: 'second',
            }).catch(console.error);

            await $mainUser.timeTracking.update({
                id: entry!.id,
                description: 'third',
            }).catch(console.error);

            const history = await $mainUser.timeTracking.fetchHistory(entry!.id).catch(console.error);
            expect(Array.isArray(history)).toBe(true);
            expect(history!.length).toBeGreaterThan(0);
        });
    });

    describe('2. Foreign goal access (no invitation)', () => {
        it('start on foreign task is forbidden', async () => {
            const status = await $invitedUser.timeTracking.start({ taskId }).catch((err) => err.status);
            expect(status).toBe(403);
        });

        it('createManual on foreign task is forbidden', async () => {
            const status = await $invitedUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
            }).catch((err) => err.status);
            expect(status).toBe(403);
        });

        it('fetchEntries with foreign goalId is forbidden', async () => {
            const status = await $invitedUser.timeTracking.fetchEntries({ goalId }).catch((err) => err.status);
            expect(status).toBe(403);
        });

        it('fetchEntries with foreign taskId is forbidden', async () => {
            const status = await $invitedUser.timeTracking.fetchEntries({ taskId }).catch((err) => err.status);
            expect(status).toBe(403);
        });

        it('summaryByTask/summaryByGoal on foreign resources are forbidden', async () => {
            const taskStatus = await $invitedUser.timeTracking.summaryByTask(taskId).catch((err) => err.status);
            expect(taskStatus).toBe(403);

            const goalStatus = await $invitedUser.timeTracking.summaryByGoal(goalId).catch((err) => err.status);
            expect(goalStatus).toBe(403);
        });

        it('stop by foreign entryId returns 403/404 to non-collaborator', async () => {
            const started = await $mainUser.timeTracking.start({ taskId }).catch(console.error);
            expect(started?.entry).toBeDefined();

            const status = await $invitedUser.timeTracking.stop({ entryId: started!.entry.id }).catch((err) => err.status);
            expect([403, 404]).toContain(status);

            await $mainUser.timeTracking.stop({ entryId: started?.entry.id }).catch(() => null);
        });

        it('update/delete of foreign entry returns 403/404', async () => {
            const entry = await $mainUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
            }).catch(console.error);
            expect(entry).toBeDefined();

            const updateStatus = await $invitedUser.timeTracking.update({
                id: entry!.id,
                description: 'hacked',
            }).catch((err) => err.status);
            expect([403, 404]).toContain(updateStatus);

            const deleteStatus = await $invitedUser.timeTracking.delete(entry!.id).catch((err) => err.status);
            expect([403, 404]).toContain(deleteStatus);
        });
    });

    describe('3. Invited user without time-tracking permissions', () => {
        beforeEach(async () => {
            await inviteUserToGoalWithRole(goalId, `tt-no-perms-${timestamp}`, []);
        });

        it('start is forbidden without TIMETRACKING_CAN_LOG', async () => {
            const status = await $invitedUser.timeTracking.start({ taskId }).catch((err) => err.status);
            expect(status).toBe(403);
        });

        it('createManual is forbidden without TIMETRACKING_CAN_LOG', async () => {
            const status = await $invitedUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
            }).catch((err) => err.status);
            expect(status).toBe(403);
        });

        it('fetchEntries by goalId is forbidden without TIMETRACKING_CAN_VIEW', async () => {
            const status = await $invitedUser.timeTracking.fetchEntries({ goalId }).catch((err) => err.status);
            expect(status).toBe(403);
        });

        it('summaryByTask/summaryByGoal are forbidden without VIEW/MANAGE_ALL', async () => {
            const taskStatus = await $invitedUser.timeTracking.summaryByTask(taskId).catch((err) => err.status);
            expect(taskStatus).toBe(403);
            const goalStatus = await $invitedUser.timeTracking.summaryByGoal(goalId).catch((err) => err.status);
            expect(goalStatus).toBe(403);
        });

        it('update/delete of owner entry is forbidden', async () => {
            const entry = await $mainUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
            }).catch(console.error);
            expect(entry).toBeDefined();

            const updateStatus = await $invitedUser.timeTracking.update({
                id: entry!.id,
                description: 'hacked',
            }).catch((err) => err.status);
            expect(updateStatus).toBe(403);

            const deleteStatus = await $invitedUser.timeTracking.delete(entry!.id).catch((err) => err.status);
            expect(deleteStatus).toBe(403);
        });
    });

    describe('4. Invited user with TIMETRACKING_CAN_LOG only', () => {
        let invitedRoleId: number;

        beforeEach(async () => {
            const { roleId } = await inviteUserToGoalWithRole(goalId, `tt-log-only-${timestamp}`, [
                TvPermissions.TIMETRACKING_CAN_LOG,
            ]);
            invitedRoleId = roleId;
        });

        it('can start, stop, createManual, update and delete OWN entries', async () => {
            const started = await $invitedUser.timeTracking.start({ taskId }).catch(console.error);
            expect(started?.entry).toBeDefined();

            const stopped = await $invitedUser.timeTracking.stop({ entryId: started!.entry.id }).catch(console.error);
            expect(stopped?.endedAt).not.toBeNull();

            const manual = await $invitedUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
            }).catch(console.error);
            expect(manual?.taskId).toBe(taskId);

            const updated = await $invitedUser.timeTracking.update({
                id: manual!.id,
                description: 'updated own',
            }).catch(console.error);
            expect(updated?.description).toBe('updated own');

            const del = await $invitedUser.timeTracking.delete(manual!.id).catch(console.error);
            expect(del?.deleted).toBe(true);
        });

        it('cannot view or edit other users entries (no VIEW/MANAGE_ALL)', async () => {
            const ownerEntry = await $mainUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
            }).catch(console.error);
            expect(ownerEntry).toBeDefined();

            const updateStatus = await $invitedUser.timeTracking.update({
                id: ownerEntry!.id,
                description: 'hacked',
            }).catch((err) => err.status);
            expect(updateStatus).toBe(403);

            const deleteStatus = await $invitedUser.timeTracking.delete(ownerEntry!.id).catch((err) => err.status);
            expect(deleteStatus).toBe(403);

            const historyStatus = await $invitedUser.timeTracking.fetchHistory(ownerEntry!.id).catch((err) => err.status);
            expect(historyStatus).toBe(403);
        });

        it('cannot fetchEntries by goalId without VIEW (middleware rejects)', async () => {
            const status = await $invitedUser.timeTracking.fetchEntries({ goalId }).catch((err) => err.status);
            expect(status).toBe(403);
        });

        it('cannot fetchHistory of OWN entry without VIEW or MANAGE_ALL', async () => {
            const ownEntry = await $invitedUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
            }).catch(console.error);
            expect(ownEntry).toBeDefined();

            const status = await $invitedUser.timeTracking.fetchHistory(ownEntry!.id).catch((err) => err.status);
            expect(status).toBe(403);
        });

        it('cannot update or delete OWN entry after TIMETRACKING_CAN_LOG is revoked', async () => {
            const ownEntry = await $invitedUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
                description: 'original',
            }).catch(console.error);
            expect(ownEntry).toBeDefined();

            await togglePermissionForRole(invitedRoleId, TvPermissions.TIMETRACKING_CAN_LOG);

            const updateStatus = await $invitedUser.timeTracking.update({
                id: ownEntry!.id,
                description: 'should not pass',
            }).catch((err) => err.status);
            expect(updateStatus).toBe(403);

            const deleteStatus = await $invitedUser.timeTracking.delete(ownEntry!.id).catch((err) => err.status);
            expect(deleteStatus).toBe(403);

            const startStatus = await $invitedUser.timeTracking.start({ taskId }).catch((err) => err.status);
            expect(startStatus).toBe(403);

            const createStatus = await $invitedUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(20),
                endedAt: isoMinutesAgo(10),
            }).catch((err) => err.status);
            expect(createStatus).toBe(403);
        });
    });

    describe('5. Invited user with TIMETRACKING_CAN_MANAGE_ALL', () => {
        beforeEach(async () => {
            await inviteUserToGoalWithRole(goalId, `tt-manage-all-${timestamp}`, [
                TvPermissions.TIMETRACKING_CAN_MANAGE_ALL,
            ]);
        });

        it('can update and delete owner entry', async () => {
            const ownerEntry = await $mainUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
            }).catch(console.error);
            expect(ownerEntry).toBeDefined();

            const updated = await $invitedUser.timeTracking.update({
                id: ownerEntry!.id,
                description: 'edited by manager',
            }).catch(console.error);
            expect(updated?.description).toBe('edited by manager');

            const del = await $invitedUser.timeTracking.delete(ownerEntry!.id).catch(console.error);
            expect(del?.deleted).toBe(true);
        });

        it('sees all goal entries (own and owner) via fetchEntries with goalId', async () => {
            const ownerEntry = await $mainUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
            }).catch(console.error);
            const invitedEntry = await $invitedUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(45),
                endedAt: isoMinutesAgo(20),
            }).catch(console.error);
            expect(ownerEntry).toBeDefined();
            expect(invitedEntry).toBeDefined();

            const entries = await $invitedUser.timeTracking.fetchEntries({ goalId }).catch(console.error);
            const ids = entries?.map((e) => e.id) ?? [];
            expect(ids).toContain(ownerEntry!.id);
            expect(ids).toContain(invitedEntry!.id);
        });

        it('fetchHistory of owner entry is allowed', async () => {
            const ownerEntry = await $mainUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
            }).catch(console.error);

            await $mainUser.timeTracking.update({
                id: ownerEntry!.id,
                description: 'edit 1',
            }).catch(console.error);

            const history = await $invitedUser.timeTracking.fetchHistory(ownerEntry!.id).catch(console.error);
            expect(Array.isArray(history)).toBe(true);
        });
    });

    describe('6. Cross-goal/task substitution attempts', () => {
        it('createManual with foreign taskId is forbidden (canLogTimeOnTask)', async () => {
            const status = await $invitedUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
            }).catch((err) => err.status);
            expect(status).toBe(403);
        });

        it('fetchEntries with goalIds including foreign goal filters out foreign entries', async () => {
            const ownEntry = await $invitedUser.timeTracking.createManual({
                taskId: foreignTaskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
            }).catch(console.error);
            expect(ownEntry).toBeDefined();

            const ownerEntry = await $mainUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
            }).catch(console.error);
            expect(ownerEntry).toBeDefined();

            const entries = await $invitedUser.timeTracking.fetchEntries({
                organizationId: foreignOrgId,
                goalIds: [foreignGoalId, goalId],
            }).catch(console.error);

            const fetched = entries ?? [];
            expect(fetched.some((e) => e.id === ownEntry!.id)).toBe(true);
            expect(fetched.some((e) => e.id === ownerEntry!.id)).toBe(false);
        });

        it('summaryByGoal with foreign goalId is forbidden', async () => {
            const status = await $invitedUser.timeTracking.summaryByGoal(goalId).catch((err) => err.status);
            expect(status).toBe(403);
        });

        it('reports request with foreign organizationId is forbidden', async () => {
            const status = await $invitedUser.timeTracking.reportSummary({
                organizationId,
                from: isoMinutesAgo(60 * 24),
                to: isoMinutesFromNow(60 * 24),
            }).catch((err) => err.status);
            expect(status).toBe(403);
        });
    });

    describe('7. fetchEntries filters', () => {
        let entryA: TimeEntryItem;
        let entryB: TimeEntryItem;
        let entryC: TimeEntryItem;

        beforeEach(async () => {
            const a = await $mainUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(120),
                endedAt: isoMinutesAgo(90),
                billable: true,
            }).catch(console.error);
            const b = await $mainUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
                billable: false,
            }).catch(console.error);
            const c = await $mainUser.timeTracking.createManual({
                taskId: secondaryTaskId,
                startedAt: isoMinutesAgo(45),
                endedAt: isoMinutesAgo(15),
                billable: true,
            }).catch(console.error);

            if (!a || !b || !c) throw new Error('Failed to seed entries');
            entryA = a;
            entryB = b;
            entryC = c;
        });

        it('returns own accessible entries when organizationId is provided without goal/task scope', async () => {
            const entries = await $mainUser.timeTracking.fetchEntries({ organizationId }).catch(console.error);
            const ids = entries?.map((e) => e.id) ?? [];
            expect(ids).toContain(entryA.id);
            expect(ids).toContain(entryB.id);
            expect(ids).toContain(entryC.id);
        });

        it('returns empty array when no organizationId and no goal/task is given', async () => {
            const entries = await $mainUser.timeTracking.fetchEntries({}).catch(console.error);
            expect(entries).toEqual([]);
        });

        it('filters by taskId', async () => {
            const entries = await $mainUser.timeTracking.fetchEntries({ taskId: secondaryTaskId }).catch(console.error);
            const ids = entries?.map((e) => e.id) ?? [];
            expect(ids).toContain(entryC.id);
            expect(ids).not.toContain(entryA.id);
            expect(ids).not.toContain(entryB.id);
        });

        it('filters by billable=false', async () => {
            const entries = await $mainUser.timeTracking.fetchEntries({ goalId, billable: false }).catch(console.error);
            const ids = entries?.map((e) => e.id) ?? [];
            expect(ids).toContain(entryB.id);
            expect(ids).not.toContain(entryA.id);
            expect(ids).not.toContain(entryC.id);
        });

        it('filters by userId', async () => {
            const userData = (await $mainUser.timeTracking.fetchEntries({ goalId })) ?? [];
            const ownerUserId = userData[0]?.userId;
            expect(ownerUserId).toBeDefined();

            const entries = await $mainUser.timeTracking.fetchEntries({
                goalId,
                userId: ownerUserId,
            }).catch(console.error);
            expect(entries?.every((e) => e.userId === ownerUserId)).toBe(true);
        });

        it('filters by from/to', async () => {
            const from = isoMinutesAgo(75);
            const to = isoMinutesFromNow(1);
            const entries = await $mainUser.timeTracking.fetchEntries({ goalId, from, to }).catch(console.error);
            const ids = entries?.map((e) => e.id) ?? [];
            expect(ids).toContain(entryB.id);
            expect(ids).not.toContain(entryA.id);
        });

        it('respects limit and offset', async () => {
            const first = await $mainUser.timeTracking.fetchEntries({ goalId, limit: 1, offset: 0 }).catch(console.error);
            expect(first?.length).toBe(1);

            const second = await $mainUser.timeTracking.fetchEntries({ goalId, limit: 1, offset: 1 }).catch(console.error);
            expect(second?.length).toBe(1);
            expect(second?.[0].id).not.toBe(first?.[0].id);
        });

        it('fetchEntries with goalIds containing only inaccessible goals returns empty', async () => {
            const entries = await $invitedUser.timeTracking.fetchEntries({
                organizationId: foreignOrgId,
                goalIds: [goalId],
            }).catch(console.error);
            expect(entries).toEqual([]);
        });

        it('fetchEntries with both goalId and taskId narrows to the task within the goal', async () => {
            const entries = await $mainUser.timeTracking.fetchEntries({
                goalId,
                taskId: secondaryTaskId,
            }).catch(console.error);
            const ids = entries?.map((e) => e.id) ?? [];
            expect(ids).toContain(entryC.id);
            expect(ids).not.toContain(entryA.id);
            expect(ids).not.toContain(entryB.id);
        });
    });

    describe('8. Reports', () => {
        beforeEach(async () => {
            await $mainUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
                billable: true,
            }).catch(console.error);
            await $mainUser.timeTracking.createManual({
                taskId: secondaryTaskId,
                startedAt: isoMinutesAgo(45),
                endedAt: isoMinutesAgo(15),
                billable: false,
            }).catch(console.error);
        });

        it('rejects request without organizationId (400)', async () => {
            const status = await $mainUser.timeTracking.reportSummary({
                organizationId: undefined as unknown as number,
                from: isoMinutesAgo(60 * 24),
                to: isoMinutesFromNow(60 * 24),
            }).catch((err) => err.status);
            expect(status).toBe(400);
        });

        it('non-member of organization receives 403', async () => {
            const status = await $invitedUser.timeTracking.reportSummary({
                organizationId,
                from: isoMinutesAgo(60 * 24),
                to: isoMinutesFromNow(60 * 24),
            }).catch((err) => err.status);
            expect(status).toBe(403);
        });

        it('reportSummary returns aggregated totals for accessible goals', async () => {
            const summary = await $mainUser.timeTracking.reportSummary({
                organizationId,
                from: isoMinutesAgo(60 * 24),
                to: isoMinutesFromNow(60 * 24),
            }).catch(console.error);
            expect(summary).toBeDefined();
            expect(summary?.entriesCount).toBeGreaterThanOrEqual(2);
            expect(summary?.totalSeconds).toBeGreaterThanOrEqual(60 * 60);
            expect(summary?.totalBillableSeconds).toBeGreaterThanOrEqual(30 * 60);
        });

        it('reportByDay returns at least one row', async () => {
            const rows = await $mainUser.timeTracking.reportByDay({
                organizationId,
                from: isoMinutesAgo(60 * 24),
                to: isoMinutesFromNow(60 * 24),
            }).catch(console.error);
            expect(Array.isArray(rows)).toBe(true);
            expect(rows!.length).toBeGreaterThan(0);
        });

        it('reportByUser returns at least one row with userId', async () => {
            const rows = await $mainUser.timeTracking.reportByUser({
                organizationId,
                from: isoMinutesAgo(60 * 24),
                to: isoMinutesFromNow(60 * 24),
            }).catch(console.error);
            expect(Array.isArray(rows)).toBe(true);
            expect(rows!.length).toBeGreaterThan(0);
            expect(rows![0].userId).toBeDefined();
        });

        it('reportByTask returns rows grouped by task', async () => {
            const rows = await $mainUser.timeTracking.reportByTask({
                organizationId,
                from: isoMinutesAgo(60 * 24),
                to: isoMinutesFromNow(60 * 24),
            }).catch(console.error);
            expect(Array.isArray(rows)).toBe(true);
            const taskIds = rows!.map((r) => r.taskId);
            expect(taskIds).toContain(taskId);
            expect(taskIds).toContain(secondaryTaskId);
        });

        it('reportContributors returns at least the current user', async () => {
            const rows = await $mainUser.timeTracking.reportContributors({
                organizationId,
                from: isoMinutesAgo(60 * 24),
                to: isoMinutesFromNow(60 * 24),
            }).catch(console.error);
            expect(Array.isArray(rows)).toBe(true);
            expect(rows!.length).toBeGreaterThan(0);
            expect(rows!.some((r) => r.userEmail === mainUserEmail)).toBe(true);
        });

        it('reports respect goalIds intersection with accessible goals', async () => {
            const summary = await $mainUser.timeTracking.reportSummary({
                organizationId,
                goalIds: [secondaryGoalId],
                from: isoMinutesAgo(60 * 24),
                to: isoMinutesFromNow(60 * 24),
            }).catch(console.error);
            expect(summary).toBeDefined();
            expect(summary?.entriesCount).toBe(0);
        });
    });

    describe('9. Edge cases', () => {
        it('stop without an active timer returns 404', async () => {
            await stopActiveIfAny($mainUser);
            const status = await $mainUser.timeTracking.stop().catch((err) => err.status);
            expect(status).toBe(404);
        });

        it('stop with non-existent entryId returns 404', async () => {
            const status = await $mainUser.timeTracking.stop({ entryId: 999999999 }).catch((err) => err.status);
            expect(status).toBe(404);
        });

        it('update of non-existent entry returns 404', async () => {
            const status = await $mainUser.timeTracking.update({
                id: 999999999,
                description: 'nope',
            }).catch((err) => err.status);
            expect(status).toBe(404);
        });

        it('delete of non-existent entry returns 404', async () => {
            const status = await $mainUser.timeTracking.delete(999999999).catch((err) => err.status);
            expect(status).toBe(404);
        });

        it('start with non-existent taskId returns 403', async () => {
            const status = await $mainUser.timeTracking.start({ taskId: 999999999 }).catch((err) => err.status);
            expect(status).toBe(403);
        });

        it('fetchHistory of non-existent entry returns 404', async () => {
            const status = await $mainUser.timeTracking.fetchHistory(999999999).catch((err) => err.status);
            expect(status).toBe(404);
        });

        it('createManual on non-existent task returns 403 (middleware blocks)', async () => {
            const status = await $mainUser.timeTracking.createManual({
                taskId: 999999999,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
            }).catch((err) => err.status);
            expect(status).toBe(403);
        });

        it('createManual with description longer than 500 characters is rejected', async () => {
            const tooLong = 'a'.repeat(501);
            const status = await $mainUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
                description: tooLong,
            }).catch((err) => err.status);
            expect(status).toBe(400);
        });

        it('start without taskId is rejected by middleware (400)', async () => {
            const status = await $mainUser.timeTracking.start({ taskId: undefined as unknown as number }).catch((err) => err.status);
            expect(status).toBe(400);
        });

        it('reportSummary with invalid timezone is rejected (400)', async () => {
            const status = await $mainUser.timeTracking.reportSummary({
                organizationId,
                from: isoMinutesAgo(60 * 24),
                to: isoMinutesFromNow(60 * 24),
                timezone: 'Not/A_Real_Zone',
            }).catch((err) => err.status);
            expect(status).toBe(400);
        });

        it('deleting an active timer removes it and clears active state', async () => {
            const started = await $mainUser.timeTracking.start({ taskId }).catch(console.error);
            expect(started?.entry).toBeDefined();

            const result = await $mainUser.timeTracking.delete(started!.entry.id).catch(console.error);
            expect(result?.deleted).toBe(true);

            const active = await $mainUser.timeTracking.getActive().catch(console.error);
            expect(active).toBeNull();
        });
    });

    describe('10. Default goal roles include time-tracking permissions', () => {
        it('assigning default executor role grants log and view permissions', async () => {
            const roles = await $mainUser.collaboration.fetchRolesForGoal(goalId).catch(console.error);
            const executor = roles?.find((r) => r.name === 'executor');
            expect(executor).toBeDefined();

            const invited = await $mainUser.collaboration.inviteUserToGoal({
                goalId,
                email: invitedUserEmail,
            }).catch(console.error);
            expect(invited).toBeDefined();

            await $mainUser.collaboration.toggleUserRoles({
                goalId,
                userId: invited!.id,
                roles: [executor!.id],
            }).catch(console.error);

            const started = await $invitedUser.timeTracking.start({ taskId }).catch(console.error);
            expect(started?.entry).toBeDefined();
            await $invitedUser.timeTracking.stop({ entryId: started?.entry.id }).catch(() => null);

            const entries = await $invitedUser.timeTracking.fetchEntries({ goalId }).catch((err) => err.status);
            expect(Array.isArray(entries)).toBe(true);
        });

        it('assigning default editor role grants MANAGE_ALL on time entries', async () => {
            const roles = await $mainUser.collaboration.fetchRolesForGoal(goalId).catch(console.error);
            const editor = roles?.find((r) => r.name === 'editor');
            expect(editor).toBeDefined();

            const invited = await $mainUser.collaboration.inviteUserToGoal({
                goalId,
                email: invitedUserEmail,
            }).catch(console.error);
            expect(invited).toBeDefined();

            await $mainUser.collaboration.toggleUserRoles({
                goalId,
                userId: invited!.id,
                roles: [editor!.id],
            }).catch(console.error);

            const ownerEntry = await $mainUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
            }).catch(console.error);
            expect(ownerEntry).toBeDefined();

            const updated = await $invitedUser.timeTracking.update({
                id: ownerEntry!.id,
                description: 'edited by editor',
            }).catch(console.error);
            expect(updated?.description).toBe('edited by editor');
        });
    });

    describe('11. canViewActiveTimer with API tokens', () => {
        const createdTokenIds: number[] = [];

        const createTokenApi = async (data: {
            name: string;
            allowedPermissions?: string[];
            allowedGoalIds?: number[];
        }) => {
            const created = await $mainUser.apiTokens.create(data);
            if (!created) throw new Error(`Failed to create token ${data.name}`);
            createdTokenIds.push(created.item.id);
            const tokenApi = new TvApi(axios.create({
                baseURL: API_URL,
                headers: { Authorization: `Bearer ${created.token}` },
            }));
            return { tokenApi, token: created.token, id: created.item.id };
        };

        beforeEach(async () => {
            while (createdTokenIds.length) {
                const id = createdTokenIds.pop()!;
                await $mainUser.apiTokens.delete(id).catch(() => null);
            }
        });

        it('token with TIMETRACKING_CAN_VIEW returns the active entry', async () => {
            const started = await $mainUser.timeTracking.start({ taskId }).catch(console.error);
            expect(started?.entry).toBeDefined();

            const { tokenApi } = await createTokenApi({
                name: `tt-view-token-${timestamp}`,
                allowedPermissions: [TvPermissions.TIMETRACKING_CAN_VIEW],
            });

            const active = await tokenApi.timeTracking.getActive().catch(console.error);
            expect(active).not.toBeNull();
            expect(active?.id).toBe(started!.entry.id);
        });

        it('token with TIMETRACKING_CAN_LOG returns the active entry', async () => {
            const started = await $mainUser.timeTracking.start({ taskId }).catch(console.error);
            expect(started?.entry).toBeDefined();

            const { tokenApi } = await createTokenApi({
                name: `tt-log-token-${timestamp}`,
                allowedPermissions: [TvPermissions.TIMETRACKING_CAN_LOG],
            });

            const active = await tokenApi.timeTracking.getActive().catch(console.error);
            expect(active).not.toBeNull();
            expect(active?.id).toBe(started!.entry.id);
        });

        it('token with TIMETRACKING_CAN_MANAGE_ALL returns the active entry', async () => {
            const started = await $mainUser.timeTracking.start({ taskId }).catch(console.error);
            expect(started?.entry).toBeDefined();

            const { tokenApi } = await createTokenApi({
                name: `tt-manage-token-${timestamp}`,
                allowedPermissions: [TvPermissions.TIMETRACKING_CAN_MANAGE_ALL],
            });

            const active = await tokenApi.timeTracking.getActive().catch(console.error);
            expect(active).not.toBeNull();
            expect(active?.id).toBe(started!.entry.id);
        });

        it('token with non-time-tracking permissions only returns 403', async () => {
            await $mainUser.timeTracking.start({ taskId }).catch(console.error);

            const { tokenApi } = await createTokenApi({
                name: `no-tt-token-${timestamp}`,
                allowedPermissions: [TvPermissions.COMPONENT_CAN_WATCH_CONTENT],
            });

            const status = await tokenApi.timeTracking.getActive().catch((err) => err.status);
            expect(status).toBe(403);
        });

        it('token with multiple non-time-tracking permissions still returns 403', async () => {
            await $mainUser.timeTracking.start({ taskId }).catch(console.error);

            const { tokenApi } = await createTokenApi({
                name: `mixed-no-tt-token-${timestamp}`,
                allowedPermissions: [
                    TvPermissions.COMPONENT_CAN_WATCH_CONTENT,
                    TvPermissions.COMPONENT_CAN_ADD_TASKS,
                    TvPermissions.TASK_CAN_EDIT_DESCRIPTION,
                ],
            });

            const status = await tokenApi.timeTracking.getActive().catch((err) => err.status);
            expect(status).toBe(403);
        });

        it('token with allowedGoalIds not containing the active timer goal returns 403', async () => {
            const started = await $mainUser.timeTracking.start({ taskId }).catch(console.error);
            expect(started?.entry).toBeDefined();

            const { tokenApi } = await createTokenApi({
                name: `wrong-goal-scope-${timestamp}`,
                allowedGoalIds: [secondaryGoalId],
            });

            const status = await tokenApi.timeTracking.getActive().catch((err) => err.status);
            expect(status).toBe(403);
        });

        it('token with allowedGoalIds containing the active timer goal returns the entry', async () => {
            const started = await $mainUser.timeTracking.start({ taskId }).catch(console.error);
            expect(started?.entry).toBeDefined();

            const { tokenApi } = await createTokenApi({
                name: `right-goal-scope-${timestamp}`,
                allowedGoalIds: [goalId],
            });

            const active = await tokenApi.timeTracking.getActive().catch(console.error);
            expect(active).not.toBeNull();
            expect(active?.id).toBe(started!.entry.id);
            expect(active?.goalId).toBe(goalId);
        });

        it('token with allowedGoalIds and no active timer returns null without 403', async () => {
            await stopActiveIfAny($mainUser);

            const { tokenApi } = await createTokenApi({
                name: `no-active-${timestamp}`,
                allowedGoalIds: [secondaryGoalId],
            });

            const active = await tokenApi.timeTracking.getActive().catch((err) => err.status);
            expect(active).toBeNull();
        });

        it('token without allowedPermissions and without allowedGoalIds returns the active entry', async () => {
            const started = await $mainUser.timeTracking.start({ taskId }).catch(console.error);
            expect(started?.entry).toBeDefined();

            const { tokenApi } = await createTokenApi({
                name: `unrestricted-token-${timestamp}`,
            });

            const active = await tokenApi.timeTracking.getActive().catch(console.error);
            expect(active).not.toBeNull();
            expect(active?.id).toBe(started!.entry.id);
        });

        it('token scoped both by goal and by TT permission allows reading active in scope', async () => {
            const started = await $mainUser.timeTracking.start({ taskId }).catch(console.error);
            expect(started?.entry).toBeDefined();

            const { tokenApi } = await createTokenApi({
                name: `combined-scope-${timestamp}`,
                allowedPermissions: [TvPermissions.TIMETRACKING_CAN_VIEW],
                allowedGoalIds: [goalId],
            });

            const active = await tokenApi.timeTracking.getActive().catch(console.error);
            expect(active).not.toBeNull();
            expect(active?.id).toBe(started!.entry.id);
        });

        it('token with TT permission but wrong goal scope still returns 403', async () => {
            await $mainUser.timeTracking.start({ taskId }).catch(console.error);

            const { tokenApi } = await createTokenApi({
                name: `tt-perm-wrong-goal-${timestamp}`,
                allowedPermissions: [TvPermissions.TIMETRACKING_CAN_VIEW],
                allowedGoalIds: [secondaryGoalId],
            });

            const status = await tokenApi.timeTracking.getActive().catch((err) => err.status);
            expect(status).toBe(403);
        });
    });

    describe('12. API token scopes on fetchEntries and reports', () => {
        const createdTokenIds: number[] = [];

        const createTokenApi = async (data: {
            name: string;
            allowedPermissions?: string[];
            allowedGoalIds?: number[];
        }) => {
            const created = await $mainUser.apiTokens.create(data);
            if (!created) throw new Error(`Failed to create token ${data.name}`);
            createdTokenIds.push(created.item.id);
            const tokenApi = new TvApi(axios.create({
                baseURL: API_URL,
                headers: { Authorization: `Bearer ${created.token}` },
            }));
            return { tokenApi };
        };

        beforeEach(async () => {
            while (createdTokenIds.length) {
                const id = createdTokenIds.pop()!;
                await $mainUser.apiTokens.delete(id).catch(() => null);
            }
        });

        it('fetchEntries without goal/task scope returns 403 for token with non-TT permissions only', async () => {
            const { tokenApi } = await createTokenApi({
                name: `no-tt-fetch-${timestamp}`,
                allowedPermissions: [TvPermissions.COMPONENT_CAN_WATCH_CONTENT],
            });

            const status = await tokenApi.timeTracking.fetchEntries({ organizationId }).catch((err) => err.status);
            expect(status).toBe(403);
        });

        it('fetchEntries without goal/task scope succeeds for token with TT permission', async () => {
            await $mainUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
            }).catch(console.error);

            const { tokenApi } = await createTokenApi({
                name: `tt-view-fetch-${timestamp}`,
                allowedPermissions: [TvPermissions.TIMETRACKING_CAN_VIEW],
            });

            const entries = await tokenApi.timeTracking.fetchEntries({ organizationId }).catch(console.error);
            expect(Array.isArray(entries)).toBe(true);
            expect(entries!.length).toBeGreaterThanOrEqual(1);
        });

        it('fetchEntries without scope succeeds for unrestricted token', async () => {
            const { tokenApi } = await createTokenApi({
                name: `unrestricted-fetch-${timestamp}`,
            });

            const entries = await tokenApi.timeTracking.fetchEntries({ organizationId }).catch(console.error);
            expect(Array.isArray(entries)).toBe(true);
        });

        it('fetchEntries by goalId returns 403 for token with non-TT permissions only', async () => {
            const { tokenApi } = await createTokenApi({
                name: `no-tt-fetch-goal-${timestamp}`,
                allowedPermissions: [TvPermissions.COMPONENT_CAN_WATCH_CONTENT],
            });

            const status = await tokenApi.timeTracking.fetchEntries({ goalId }).catch((err) => err.status);
            expect(status).toBe(403);
        });

        it('reportSummary returns 403 for token with non-TT permissions only', async () => {
            const { tokenApi } = await createTokenApi({
                name: `no-tt-report-summary-${timestamp}`,
                allowedPermissions: [TvPermissions.COMPONENT_CAN_WATCH_CONTENT],
            });

            const status = await tokenApi.timeTracking.reportSummary({
                organizationId,
                from: isoMinutesAgo(60 * 24),
                to: isoMinutesFromNow(60),
            }).catch((err) => err.status);
            expect(status).toBe(403);
        });

        it('reportByDay returns 403 for token with non-TT permissions only', async () => {
            const { tokenApi } = await createTokenApi({
                name: `no-tt-report-day-${timestamp}`,
                allowedPermissions: [TvPermissions.COMPONENT_CAN_WATCH_CONTENT],
            });

            const status = await tokenApi.timeTracking.reportByDay({
                organizationId,
                from: isoMinutesAgo(60 * 24),
                to: isoMinutesFromNow(60),
            }).catch((err) => err.status);
            expect(status).toBe(403);
        });

        it('reportSummary succeeds for token with TT permission', async () => {
            await $mainUser.timeTracking.createManual({
                taskId,
                startedAt: isoMinutesAgo(60),
                endedAt: isoMinutesAgo(30),
            }).catch(console.error);

            const { tokenApi } = await createTokenApi({
                name: `tt-view-report-${timestamp}`,
                allowedPermissions: [TvPermissions.TIMETRACKING_CAN_VIEW],
            });

            const summary = await tokenApi.timeTracking.reportSummary({
                organizationId,
                from: isoMinutesAgo(60 * 24),
                to: isoMinutesFromNow(60),
            }).catch(console.error);
            expect(summary).toBeDefined();
            expect(summary?.totalSeconds).toBeGreaterThanOrEqual(0);
        });

        it('reportContributors returns 403 for token with non-TT permissions only', async () => {
            const { tokenApi } = await createTokenApi({
                name: `no-tt-report-contrib-${timestamp}`,
                allowedPermissions: [TvPermissions.COMPONENT_CAN_WATCH_CONTENT],
            });

            const status = await tokenApi.timeTracking.reportContributors({
                organizationId,
                from: isoMinutesAgo(60 * 24),
                to: isoMinutesFromNow(60),
            }).catch((err) => err.status);
            expect(status).toBe(403);
        });
    });
});
