import type { Readable } from 'stream';

export type ImportCredentials = Record<string, string>;

export const IMPORT_LOCALES = ['en', 'ru', 'de', 'es', 'pt-BR'] as const;

export type ImportLocale = (typeof IMPORT_LOCALES)[number];

export type ImportOptionValue = string | boolean;

export type ImportProviderOptions = Record<string, ImportOptionValue>;

export type ImportCredentialField = {
    key: string;
    secret: boolean;
};

export type ImportProviderAuth = {
    popupAuthorizeUrl: string | null;
    popupCredentialKey: string | null;
    manualFields: ImportCredentialField[];
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

export type ImportValidationResult =
    | { ok: true; accountName: string }
    | { ok: false; code: ImportProviderErrorCode };

export type ImportProviderErrorCode =
    | 'invalid_credentials'
    | 'invalid_url'
    | 'private_url'
    | 'not_found'
    | 'rate_limited'
    | 'unavailable'
    | 'too_large';

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

export type ImportStatus = {
    externalId: string;
    name: string;
};

export type ImportList = {
    externalId: string;
    name: string;
};

export type ImportTag = {
    externalId: string;
    name: string;
    color: string;
};

export type ImportStructure = {
    projectName: string;
    projectDescription: string | null;
    statuses: ImportStatus[];
    lists: ImportList[];
    tags: ImportTag[];
    taskCount: number;
};

export type ImportAttachment = {
    externalId: string;
    name: string;
    mimeType: string;
    sizeBytes: number | null;
    downloadRef: string;
};

export type ImportTask = {
    externalId: string;
    parentExternalId: string | null;
    title: string;
    noteMarkdown: string | null;
    sourceUrl: string | null;
    statusExternalId: string | null;
    listExternalId: string | null;
    tagExternalIds: string[];
    assigneeExternalIds: string[];
    startDate: string | null;
    endDate: string | null;
    priority: ImportPriority | null;
    complete: boolean;
    completedAt: Date | null;
    attachments: ImportAttachment[];
};

export type ImportAttachmentDownload = {
    stream: Readable;
    mimeType: string;
};

export type ImportReader = {
    readStructure(): Promise<ImportStructure>;
    readTasks(): AsyncGenerator<ImportTask[]>;
    downloadAttachment(attachment: ImportAttachment): Promise<ImportAttachmentDownload>;
};

export type ImportProviderCredentialsArgs = {
    credentials: ImportCredentials;
};

export type ImportProviderProjectArgs = {
    credentials: ImportCredentials;
    externalProjectId: string;
};

export type ImportProviderReaderArgs = {
    credentials: ImportCredentials;
    externalProjectId: string;
    options: ImportProviderOptions;
    locale: ImportLocale;
};

export type ImportProviderSanitizeResult =
    | { ok: true; options: ImportProviderOptions }
    | { ok: false; message: string };

export type ImportPriority = 1 | 2 | 3;

export type ImportNoteLabels = {
    attachments: string;
    comments: string;
    recurring: string;
};

export type ImportNoteComment = {
    authorName: string;
    date: string;
    text: string;
};

export type ImportHttpClientConfig = {
    providerName: string;
    baseUrl: string;
    headers: Record<string, string>;
    minRequestIntervalMs: number;
    maxRedirects?: number;
};

export type ImportHttpRequestArgs = {
    path: string;
    params?: Record<string, string | number>;
};
