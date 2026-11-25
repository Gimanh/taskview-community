import { describe, expect, it } from 'vitest';
import { GoalPermissionsChecker } from '../../../core/GoalPermissionsChecker';
import { GoalPermissions, type GoalPermissionType } from '../../../types/auth.types';
import type { FileQuotaResolver } from '../../files/FileQuotaResolver';
import type { FileStorageFactory } from '../../files/storage/FileStorageFactory';
import type { FileQuotaState } from '../../files/types';
import type { TaskMoveRepository } from '../TaskMoveRepository';
import { TaskNoteFilesPlanner } from '../TaskNoteFilesPlanner';
import type { TaskMoveMode, TaskNoteFile, TaskNoteFilesInGoalArgs, TaskNoteSharedFilesArgs } from '../task-move.types';

const SOURCE = 10;
const TARGET = 20;
const ROOT = 100;
const SUB = 101;
const FILE_A = '11111111-2222-4333-8444-555555555555';
const FILE_B = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const FOREIGN = '99999999-8888-4777-8666-555555555555';

type FakeSetup = {
    mode?: TaskMoveMode;
    notes?: Record<number, string | null>;
    // Files of the source project; anything else a note names does not exist there
    files?: TaskNoteFile[];
    shared?: string[];
    source?: GoalPermissionType[];
    target?: GoalPermissionType[];
    quota?: FileQuotaState;
    storageConfigured?: boolean;
    providers?: string[];
};

const SOURCE_ALL = [GoalPermissions.FILE_CAN_VIEW, GoalPermissions.FILE_CAN_MANAGE];
const TARGET_ALL = [GoalPermissions.FILE_CAN_VIEW, GoalPermissions.FILE_CAN_MANAGE];
const QUOTA_OFF: FileQuotaState = { mode: 'off', quotaBytes: null, usedBytes: null, organizationId: null };

const img = (id: string) => `<img data-file-id="${id}" alt="a.png">`;
const file = (id: string, sizeBytes = 100): TaskNoteFile => ({ id, sizeBytes, storageProvider: 'local' });
const checker = (permissions: GoalPermissionType[]) =>
    new GoalPermissionsChecker(permissions.map((permissionName, i) => ({ permissionName, permissionId: i })));

function plan(setup: FakeSetup = {}) {
    const notes = setup.notes ?? { [ROOT]: img(FILE_A) };
    const files = setup.files ?? [file(FILE_A)];
    const repository = {
        fetchNotes: async (taskIds: number[]) => taskIds.map((id) => ({ id, note: notes[id] ?? null })),
        fetchFilesInGoal: async (args: TaskNoteFilesInGoalArgs) =>
            args.goalId === SOURCE ? files.filter((f) => args.fileIds.includes(f.id)) : [],
        findSharedFileIds: async (args: TaskNoteSharedFilesArgs) => new Set((setup.shared ?? []).filter((id) => args.fileIds.includes(id))),
    } as unknown as TaskMoveRepository;
    const quotas = { forGoal: async () => setup.quota ?? QUOTA_OFF } as unknown as FileQuotaResolver;
    const providers = setup.providers ?? ['local'];
    const storages = {
        isConfigured: setup.storageConfigured ?? true,
        has: (provider: string) => providers.includes(provider),
    } as unknown as FileStorageFactory;

    return new TaskNoteFilesPlanner({ repository, quotas, storages }).plan({
        mode: setup.mode ?? 'move',
        taskIds: Object.keys(notes).map(Number),
        sourceGoalId: SOURCE,
        targetGoalId: TARGET,
        source: checker(setup.source ?? SOURCE_ALL),
        destination: checker(setup.target ?? TARGET_ALL),
    });
}

describe('TaskNoteFilesPlanner', () => {
    it('moves a file that only the moved tasks use', async () => {
        expect(await plan()).toEqual({ moveIds: [FILE_A], copyIds: [], leftIds: [] });
    });

    it('copies a file that a task staying behind also uses', async () => {
        expect(await plan({ shared: [FILE_A] })).toEqual({ moveIds: [], copyIds: [FILE_A], leftIds: [] });
    });

    it('copies every file when the task itself is copied', async () => {
        expect(await plan({ mode: 'copy' })).toEqual({ moveIds: [], copyIds: [FILE_A], leftIds: [] });
    });

    it('copies instead of moving without the right to manage files in the source project', async () => {
        expect(await plan({ source: [GoalPermissions.FILE_CAN_VIEW] })).toEqual({ moveIds: [], copyIds: [FILE_A], leftIds: [] });
    });

    it.each<[string, FakeSetup]>([
        ['view files in the source project', { source: [GoalPermissions.FILE_CAN_MANAGE] }],
        ['manage files in the target project', { target: [GoalPermissions.FILE_CAN_VIEW] }],
        ['any file permission', { source: [], target: [] }],
    ])('leaves the file where it is without the right to %s', async (_label, setup) => {
        expect(await plan(setup)).toEqual({ moveIds: [], copyIds: [], leftIds: [FILE_A] });
        expect(await plan({ ...setup, mode: 'copy' })).toEqual({ moveIds: [], copyIds: [], leftIds: [FILE_A] });
    });

    it('ignores ids that are not files of the source project', async () => {
        const notes = { [ROOT]: `${img(FOREIGN)}<img data-file-id="../../x">${img(FILE_A)}` };
        expect(await plan({ notes })).toEqual({ moveIds: [FILE_A], copyIds: [], leftIds: [] });
        expect(await plan({ notes: { [ROOT]: img(FOREIGN) } })).toEqual({ moveIds: [], copyIds: [], leftIds: [] });
        expect(await plan({ notes: { [ROOT]: img(FOREIGN) }, source: [], target: [] })).toEqual({ moveIds: [], copyIds: [], leftIds: [] });
    });

    it('plans nothing for tasks without notes or images', async () => {
        expect(await plan({ notes: { [ROOT]: null, [SUB]: '<p>text</p>' } })).toEqual({ moveIds: [], copyIds: [], leftIds: [] });
    });

    it('handles the notes of subtasks like the note of the root, a file shown twice only once', async () => {
        const notes = { [ROOT]: img(FILE_A), [SUB]: `${img(FILE_A)}${img(FILE_B)}` };
        const files = [file(FILE_A), file(FILE_B)];
        expect(await plan({ notes, files })).toEqual({ moveIds: [FILE_A, FILE_B], copyIds: [], leftIds: [] });
        expect(await plan({ notes, files, shared: [FILE_B] })).toEqual({ moveIds: [FILE_A], copyIds: [FILE_B], leftIds: [] });
    });

    it('leaves a copy that does not fit into the quota, counting the copies planned before it', async () => {
        const quota: FileQuotaState = { mode: 'enforce', quotaBytes: 1000, usedBytes: 700, organizationId: 1 };
        const notes = { [ROOT]: `${img(FILE_A)}${img(FILE_B)}` };
        const files = [file(FILE_A, 200), file(FILE_B, 200)];
        expect(await plan({ mode: 'copy', notes, files, quota })).toEqual({ moveIds: [], copyIds: [FILE_A], leftIds: [FILE_B] });
        expect(await plan({ mode: 'copy', notes, files: [file(FILE_A, 300), file(FILE_B, 1)], quota })).toEqual({
            moveIds: [],
            copyIds: [FILE_A],
            leftIds: [FILE_B],
        });
    });

    it('lets a copy take exactly what is left of the quota', async () => {
        const quota: FileQuotaState = { mode: 'enforce', quotaBytes: 1000, usedBytes: 700, organizationId: 1 };
        expect(await plan({ mode: 'copy', files: [file(FILE_A, 300)], quota })).toEqual({ moveIds: [], copyIds: [FILE_A], leftIds: [] });
        expect(await plan({ mode: 'copy', files: [file(FILE_A, 301)], quota })).toEqual({ moveIds: [], copyIds: [], leftIds: [FILE_A] });
    });

    it('copies nothing into an organization that is already over its quota', async () => {
        const quota: FileQuotaState = { mode: 'enforce', quotaBytes: 1000, usedBytes: 5000, organizationId: 1 };
        expect(await plan({ mode: 'copy', quota })).toEqual({ moveIds: [], copyIds: [], leftIds: [FILE_A] });
    });

    it('moves a file whatever the quota: the organization does not grow', async () => {
        const quota: FileQuotaState = { mode: 'enforce', quotaBytes: 1000, usedBytes: 1000, organizationId: 1 };
        expect(await plan({ quota })).toEqual({ moveIds: [FILE_A], copyIds: [], leftIds: [] });
    });

    it('leaves a file that would have to be copied when storage is not configured', async () => {
        expect(await plan({ mode: 'copy', storageConfigured: false })).toEqual({ moveIds: [], copyIds: [], leftIds: [FILE_A] });
        expect(await plan({ shared: [FILE_A], providers: [] })).toEqual({ moveIds: [], copyIds: [], leftIds: [FILE_A] });
    });
});
