import { type } from 'arktype';
import type { FilesSchemaTypeForSelect, TasksSchemaTypeForSelect } from 'taskview-db-schemas';
import type { GoalPermissionsChecker } from '../../core/GoalPermissionsChecker';
import type { FileDuplicator } from '../files/FileDuplicator';
import type { FileQuotaResolver } from '../files/FileQuotaResolver';
import type { FilesRepository } from '../files/FilesRepository';
import type { FileStorageFactory } from '../files/storage/FileStorageFactory';
import type { FileInsertArgs } from '../files/types';
import type { TaskMoveRepository } from './TaskMoveRepository';
import type { TaskNoteFilesPlanner } from './TaskNoteFilesPlanner';

const NumberFromString = type('string | number').pipe((v) => Number(v));

export const TaskArkTypeMove = type({
    taskId: 'number',
    targetGoalId: 'number',
});
export type TaskArgMove = typeof TaskArkTypeMove.infer;

export const TaskArkTypeMovePreview = type({
    taskId: NumberFromString,
    targetGoalId: NumberFromString,
});

export type TaskMoveMode = 'move' | 'copy';

export type TaskMoveBlockReason =
    | 'not_found'
    | 'same_project'
    | 'other_organization'
    | 'is_subtask'
    | 'no_target_permission';

export type TaskMoveRemovals = {
    tags: number;
    assignees: number;
    fileLinks: number;
    dependencies: number;
    sprintOutcomes: number;
    integrationLinks: number;
    recurrence: number;
};

export type TaskMoveLeftBehind = {
    subtasks: number;
    timeEntries: number;
};

// Files shown as images inside the notes of the tasks that go to the target project
export type TaskMoveNoteFilesPlan = {
    // Used by these tasks only: the file itself changes project
    moveIds: string[];
    // Used elsewhere too, or the task is copied: the target project gets its own copy
    copyIds: string[];
    // Cannot be taken (permissions, quota, storage): stays in the source project
    leftIds: string[];
};

export type TaskMoveNoteFiles = {
    moved: number;
    copied: number;
    left: number;
};

export type TaskMovePlan = {
    mode: TaskMoveMode;
    rootTaskId: number;
    sourceGoalId: number;
    targetGoalId: number;
    targetGoalOwnerId: number;
    // Root first, then subtasks parent-before-child; only the tasks that go to the target project
    taskIds: number[];
    // Subtasks staying in the source project (they become standalone tasks there when the root moves)
    leftBehindSubtaskIds: number[];
    // Time entries move only in 'move' mode, and only those of the users listed here (null = everyone's)
    timeEntryUserIds: number[] | null;
    removals: TaskMoveRemovals;
    leftBehind: TaskMoveLeftBehind;
    movedTimeEntries: number;
    noteFiles: TaskMoveNoteFilesPlan;
};

export type TaskMoveDecision = { ok: true; plan: TaskMovePlan } | { ok: false; reason: TaskMoveBlockReason };

export type TaskMovePreviewDto = {
    allowed: boolean;
    reason: TaskMoveBlockReason | null;
    mode: TaskMoveMode | null;
    tasks: number;
    timeEntries: number;
    removals: TaskMoveRemovals | null;
    leftBehind: TaskMoveLeftBehind | null;
    noteFiles: TaskMoveNoteFiles | null;
};

export type TaskMoveResultDto = {
    mode: TaskMoveMode;
    taskId: number;
    goalId: number;
};

export type TaskMoveOutcome = { ok: true; data: TaskMoveResultDto } | { ok: false; reason: TaskMoveBlockReason };

export type TaskMoveContext = {
    task: TasksSchemaTypeForSelect;
    sourceOrganizationId: number | null;
    target: { id: number; organizationId: number | null; ownerId: number } | null;
};

export type TaskMoveContextArgs = {
    taskId: number;
    targetGoalId: number;
};

export type TaskMoveCountArgs = {
    taskIds: number[];
    // Links to these files stay, because the files move together with the tasks
    keptFileIds: string[];
};

export type TaskMoveTimeEntryCountArgs = {
    taskIds: number[];
    userIds: number[] | null;
};

export type TaskMoveExecuteArgs = {
    plan: TaskMovePlan;
    fileCopies: TaskMoveFileCopies;
};

export type TaskCopyExecuteArgs = {
    plan: TaskMovePlan;
    creatorId: number;
    fileCopies: TaskMoveFileCopies;
};

export type TaskCopyResult = {
    rootTaskId: number;
    tasks: TasksSchemaTypeForSelect[];
};

export type TaskMovePlannerArgs = {
    repository: TaskMoveRepository;
    noteFiles: TaskNoteFilesPlanner;
    userId: number;
    checkerForGoal: (goalId: number) => Promise<GoalPermissionsChecker>;
};

export type TaskNoteFilesPlannerArgs = {
    repository: TaskMoveRepository;
    quotas: FileQuotaResolver;
    storages: FileStorageFactory;
};

export type TaskNoteFilesPlanArgs = {
    mode: TaskMoveMode;
    taskIds: number[];
    sourceGoalId: number;
    targetGoalId: number;
    source: GoalPermissionsChecker;
    destination: GoalPermissionsChecker;
};

export type TaskNoteFilesInGoalArgs = {
    fileIds: string[];
    goalId: number;
};

export type TaskNoteSharedFilesArgs = {
    fileIds: string[];
    taskIds: number[];
    goalId: number;
};

export type TaskNote = {
    id: number;
    note: string | null;
};

export type TaskNoteFileReplaceArgs = {
    note: string;
    // Source file id -> id of its copy
    replacements: Map<string, string>;
};

export type TaskMoveFileCopy = {
    sourceId: string;
    row: FileInsertArgs;
};

export type TaskMoveFileQuota = {
    organizationId: number;
    quotaBytes: number;
};

export type TaskMoveFileCopies = {
    items: TaskMoveFileCopy[];
    quota: TaskMoveFileQuota | null;
    linkedById: number;
    linkedByEmail: string;
};

export type TaskMoveAttachCopiesArgs = {
    fileCopies: TaskMoveFileCopies;
    // Tasks already in the target project whose notes still point at the source files
    taskIds: number[];
};

export type TaskNoteFileCopierArgs = {
    filesRepository: FilesRepository;
    duplicator: FileDuplicator;
    quotas: FileQuotaResolver;
};

export type TaskNoteFileCopierPrepareArgs = {
    plan: TaskMovePlan;
    uploaderId: number;
    uploaderEmail: string;
};

export type TaskNoteFile = Pick<FilesSchemaTypeForSelect, 'id' | 'sizeBytes' | 'storageProvider'>;
