import { type } from 'arktype';
import type { Request, Response } from 'express';
import type { ImportJobsSchemaTypeForSelect, ImportJobStatus } from 'taskview-db-schemas';
import type { AppUser } from '../../core/AppUser';
import type { ImportProvider } from './core/ImportProvider';
import { IMPORT_LOCALES } from './core/import-provider.types';
import type { ImportRunReport } from './ImportRunReport';
import type {
    ImportAttachment,
    ImportCredentialField,
    ImportCredentials,
    ImportReader,
    ImportStructure,
    ImportLocale,
    ImportOptionField,
    ImportPriority,
    ImportProviderOptions,
} from './core/import-provider.types';

export const IMPORT_RUN_JOB = 'import-run';
export const IMPORT_CLEANUP_JOB = 'import-cleanup';
export const IMPORT_MAX_RUN_SECONDS = 6 * 60 * 60;
export const IMPORT_DRAFT_TTL_SECONDS = 24 * 60 * 60;
export const IMPORT_MAX_TASKS = 50_000;
export const IMPORT_MAX_DRAFTS_PER_HOUR = 10;
export const IMPORT_PROGRESS_EVENT = 'import.progress';
export const IMPORT_FINISHED_EVENT = 'import.finished';

const NumberFromString = type('string|number').pipe((v) => Number(v));

const ExternalId = type(/^[A-Za-z0-9_-]{1,64}$/);

export const ImportArkTypeCreateJob = type({
    organizationId: 'number',
    provider: 'string <= 32',
    credentials: type({ '[string]': 'string <= 512' }),
});
export type ImportArgCreateJob = typeof ImportArkTypeCreateJob.infer;

export const ImportArkTypeFetchJobs = type({
    organizationId: NumberFromString,
});
export type ImportArgFetchJobs = typeof ImportArkTypeFetchJobs.infer;

export const ImportArkTypeJobId = type({
    id: NumberFromString,
});
export type ImportArgJobId = typeof ImportArkTypeJobId.infer;

export const ImportArkTypeProjectMeta = type({
    id: NumberFromString,
    externalId: ExternalId,
});
export type ImportArgProjectMeta = typeof ImportArkTypeProjectMeta.infer;

export const ImportArkTypeStart = type({
    id: NumberFromString,
    externalProjectId: ExternalId,
    peopleMapping: type({
        externalId: ExternalId,
        organizationMemberId: 'number',
    }).array().atMostLength(500),
    options: 'object',
    locale: type.enumerated(...IMPORT_LOCALES),
});
export type ImportArgStart = typeof ImportArkTypeStart.infer;

export type ImportPeopleMappingEntry = {
    externalId: string;
    organizationMemberId: number;
};

export type ImportJobConfig = {
    peopleMapping: ImportPeopleMappingEntry[];
    options: ImportProviderOptions;
    locale: ImportLocale;
};

export type ImportJobPhase = 'structure' | 'tasks' | 'attachments' | 'finalizing';

export type ImportJobProgress = {
    phase: ImportJobPhase;
    done: number;
    total: number | null;
};

export type ImportWarningCode =
    | 'parent_missing'
    | 'attachment_storage_disabled'
    | 'attachment_too_large'
    | 'attachment_quota_exceeded'
    | 'attachment_failed';

export type ImportWarning = {
    code: ImportWarningCode;
    subject: string | null;
};

export type ImportJobStats = {
    tasksCreated: number;
    statusesCreated: number;
    listsCreated: number;
    tagsCreated: number;
    membersAdded: number;
    assigneesLinked: number;
    attachmentsUploaded: number;
    attachmentsSkipped: number;
    warnings: ImportWarning[];
    warningsTruncated: boolean;
};

export type ImportJobErrorCode =
    | 'invalid_credentials'
    | 'invalid_url'
    | 'private_url'
    | 'not_found'
    | 'rate_limited'
    | 'unavailable'
    | 'too_large'
    | 'goal_creation_failed'
    | 'forbidden'
    | 'interrupted'
    | 'internal';

export type ImportJobForClient = {
    id: number;
    organizationId: number;
    provider: string;
    status: ImportJobStatus;
    accountName: string | null;
    externalProjectId: string | null;
    externalProjectName: string | null;
    goalId: number | null;
    progress: ImportJobProgress | null;
    stats: ImportJobStats | null;
    error: ImportJobErrorCode | null;
    createdAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
};

export type ImportProviderInfo = {
    id: string;
    popupAuthorizeUrl: string | null;
    popupCredentialKey: string | null;
    manualFields: ImportCredentialField[];
    options: ImportOptionField[];
};

export type ImportRunJobData = {
    jobId: number;
};

export type ImportRepoCreateJobArgs = {
    organizationId: number;
    createdBy: number;
    provider: string;
    credentialsEncrypted: string;
    accountName: string;
};

export type ImportRepoQueueJobArgs = {
    id: number;
    externalProjectId: string;
    externalProjectName: string;
    config: ImportJobConfig;
};

export type ImportRepoFinishJobArgs = {
    id: number;
    status: Extract<ImportJobStatus, 'completed' | 'failed' | 'cancelled'>;
    stats: ImportJobStats | null;
    error: ImportJobErrorCode | null;
};

export type ImportRepoFetchJobsArgs = {
    organizationId: number;
    createdBy: number;
};

export type ImportRepoSetProgressArgs = {
    id: number;
    progress: ImportJobProgress;
};

export type ImportRepoSetGoalArgs = {
    id: number;
    goalId: number;
};

export type ImportRepoOrgMembersArgs = {
    organizationId: number;
    memberIds: number[];
};

export type ImportRepoStatusRow = {
    goalId: number;
    name: string;
};

export type ImportRepoListRow = {
    goalId: number;
    name: string;
    creatorId: number;
};

export type ImportRepoTagRow = {
    goalId: number;
    name: string;
    color: string;
    owner: number;
};

export type ImportRepoTaskRow = {
    goalId: number;
    parentId: number | null;
    description: string;
    note: string | null;
    sourceUrl: string | null;
    statusId: number | null;
    goalListId: number | null;
    startDate: string | null;
    endDate: string | null;
    priorityId: ImportPriority | null;
    complete: boolean;
    dateComplete: Date | null;
    kanbanOrder: number;
    creatorId: number;
};

export type ImportRepoTaskTagRow = {
    taskId: number;
    tagId: number;
};

export type ImportRepoAssigneeRow = {
    taskId: number;
    collabUserId: number;
};

export type ImportRepoGoalCollaboratorArgs = {
    goalId: number;
    emails: string[];
};

export type ImportApplierRunArgs = {
    jobId: number;
};

export type ImportPublishArgs = {
    userId: number;
    event: string;
    data: Record<string, unknown>;
};

export type ImportRunReportArgs = {
    jobId: number;
    userId: number;
};

export type ImportProgressArgs = {
    phase: ImportJobPhase;
    done: number;
    total: number | null;
    force?: boolean;
};

export type ImportPendingAttachment = {
    taskId: number;
    attachment: ImportAttachment;
};

export type ImportTaskWriterArgs = {
    goalId: number;
    creatorId: number;
    statusIds: Map<string, number>;
    listIds: Map<string, number>;
    tagIds: Map<string, number>;
    assigneeIds: Map<string, number>;
    report: ImportRunReport;
};

export type ImportAttachmentsUploaderArgs = {
    goalId: number;
    ensureActive: () => Promise<void>;
    actor: AppUser;
    reader: ImportReader;
    report: ImportRunReport;
};

export type ImportUploadAttachmentArgs = {
    item: ImportPendingAttachment;
    maxBytes: number;
};

export type ImportRunErrorCode = Extract<ImportJobErrorCode, 'forbidden' | 'goal_creation_failed' | 'too_large'>;

export type ImportRunContext = {
    job: ImportJobsSchemaTypeForSelect;
    config: ImportJobConfig;
    actor: AppUser;
    reader: ImportReader;
};

export type ImportStructureIds = {
    statusIds: Map<string, number>;
    listIds: Map<string, number>;
    tagIds: Map<string, number>;
    assigneeIds: Map<string, number>;
};

export type ImportCreateGoalArgs = {
    context: ImportRunContext;
    structure: ImportStructure;
};

export type ImportWriteStructureArgs = {
    context: ImportRunContext;
    structure: ImportStructure;
    goalId: number;
    report: ImportRunReport;
};

export type ImportAddPeopleArgs = {
    context: ImportRunContext;
    goalId: number;
    report: ImportRunReport;
};

export type ImportWriteTasksArgs = {
    context: ImportRunContext;
    structure: ImportStructure;
    goalId: number;
    ids: ImportStructureIds;
    report: ImportRunReport;
};

export type ImportFinishArgs = {
    job: ImportJobsSchemaTypeForSelect;
    status: Extract<ImportJobStatus, 'completed' | 'failed' | 'cancelled'>;
    report: ImportRunReport;
    error: ImportJobErrorCode | null;
};

export type ImportOrgAdminCheckArgs = {
    req: Request;
    organizationId: number;
};

export type ImportManagerErrorCode =
    | ImportJobErrorCode
    | 'unknown_provider'
    | 'not_draft'
    | 'invalid_options'
    | 'invalid_people_mapping'
    | 'already_running'
    | 'too_many_drafts';

export type ImportManagerResult<T> =
    | { ok: true; data: T }
    | { ok: false; status: 400 | 404 | 409 | 429 | 500 | 502; code: ImportManagerErrorCode };

export type ImportDraftContext = {
    provider: ImportProvider;
    credentials: ImportCredentials;
};

export type ImportWithDraftArgs<T> = {
    id: number;
    action: (context: ImportDraftContext) => Promise<T>;
};

export type ImportWhitelistCredentialsArgs = {
    provider: ImportProvider;
    credentials: ImportCredentials;
};

export type ImportRespondArgs<T> = {
    res: Response;
    result: ImportManagerResult<T>;
};

export type ImportHandleArgs = {
    res: Response;
    action: () => Promise<unknown>;
};

export type ImportRepoRecentDraftsArgs = {
    createdBy: number;
    since: Date;
};

export type ImportOrgAdminArgs = {
    userId: number;
    organizationId: number;
};
