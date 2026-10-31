export type ImportJobStatus = 'draft' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type ImportLocale = 'en' | 'ru' | 'de' | 'es' | 'pt-BR';

export type ImportCredentialField = {
    key: string;
    secret: boolean;
};

export type ImportSelectOption = {
    key: string;
    kind: 'select';
    values: string[];
    default: string;
};

export type ImportToggleOption = {
    key: string;
    kind: 'toggle';
    default: boolean;
};

export type ImportOptionField = ImportSelectOption | ImportToggleOption;

export type ImportOptionValues = Record<string, string | boolean>;

export type ImportProviderInfo = {
    id: string;
    popupAuthorizeUrl: string | null;
    popupCredentialKey: string | null;
    manualFields: ImportCredentialField[];
    options: ImportOptionField[];
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

export type ImportRequestErrorCode =
    | ImportJobErrorCode
    | 'unknown_provider'
    | 'not_draft'
    | 'invalid_options'
    | 'invalid_people_mapping'
    | 'not_cancellable'
    | 'already_running'
    | 'too_many_drafts';

export type ImportJob = {
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
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
};

export type ImportRemoteProject = {
    externalId: string;
    name: string;
    url: string | null;
};

export type ImportPerson = {
    externalId: string;
    displayName: string;
    username: string | null;
    email: string | null;
};

export type ImportProjectMeta = {
    externalId: string;
    name: string;
    url: string | null;
    people: ImportPerson[];
    taskCount: number;
    archivedTaskCount: number | null;
    attachmentCount: number | null;
    attachmentBytes: number | null;
};

export type ImportPeopleMappingEntry = {
    externalId: string;
    organizationMemberId: number;
};

export type ImportArgCreateJob = {
    organizationId: number;
    provider: string;
    credentials: Record<string, string>;
};

export type ImportArgStart = {
    id: number;
    externalProjectId: string;
    peopleMapping: ImportPeopleMappingEntry[];
    options: ImportOptionValues;
    locale: ImportLocale;
};

export type ImportArgProjectMeta = {
    id: number;
    externalId: string;
};

export type ImportProgressEvent = {
    jobId: number;
    progress: ImportJobProgress;
};

export type ImportFinishedEvent = {
    jobId: number;
    status: ImportJobStatus;
};
