import { type } from 'arktype';
import type { Readable } from 'node:stream';
import type { FileStorageProvider, FilesSchemaTypeForInsert, FilesSchemaTypeForSelect } from 'taskview-db-schemas';

export const FILE_LIST_DEFAULT_LIMIT = 50;
export const FILE_LIST_MAX_LIMIT = 200;
export const FILE_DOWNLOAD_TOKEN_TTL_SECONDS = 300;
export const FILE_NAME_MAX_LENGTH = 255;

const toNumber = type('string | number').pipe((v) => Number(v));

export const FileArkTypeGoalIdParam = type({ goalId: toNumber });
export const FileArkTypeTaskIdParam = type({ taskId: toNumber });
export const FileArkTypeFileIdParam = type({ fileId: 'string.uuid' });
export const FileArkTypeTaskFileParams = type({ taskId: toNumber, fileId: 'string.uuid' });
export const FileArkTypeTokenParam = type({ token: 'string > 0' });

export const FileArkTypeListQuery = type({
    goalId: toNumber,
    'search?': 'string',
    'type?': "'image' | 'document' | 'all'",
    'cursor?': 'string',
    'limit?': toNumber,
});

export const FileArkTypeUploadQuery = type({ 'taskId?': toNumber });
export const FileArkTypeLink = type({ fileIds: 'string.uuid[] > 0' });
export const FileArkTypeRename = type({ name: 'string > 0' }); // length is normalized in the manager, the extension is re-added there
export const FileArkTypeDownloadUrl = type({ 'inline?': 'boolean' });
export const FileArkTypeContentQuery = type({ 'inline?': 'string' });

export type FileKindFilter = 'image' | 'document' | 'all';

export type FileUploadArgs = {
    goalId: number;
    uploaderId: number;
    uploaderEmail: string;
    taskId: number | null;
    originalName: string;
    mimeType: string;
    stream: Readable;
};

export type FileListArgs = {
    goalId: number;
    search: string | null;
    type: FileKindFilter;
    cursor: string | null;
    limit: number;
};

export type FileLinkArgs = {
    taskId: number;
    fileIds: string[];
    linkedById: number;
    linkedByEmail: string;
};

export type FileUnlinkArgs = {
    taskId: number;
    fileId: string;
};

export type FileRenameArgs = {
    fileId: string;
    name: string;
};

export type FileInsertArgs = Omit<FilesSchemaTypeForInsert, 'createdAt' | 'editedAt'>;

export type FileListByProviderArgs = {
    provider: FileStorageProvider;
    excludeIds: string[];
    limit: number;
    goalId?: number | null;
};

export type FileUpdateStorageProviderArgs = {
    fileId: string;
    provider: FileStorageProvider;
};

export type FileLinkRowsArgs = {
    taskId: number;
    fileIds: string[];
    linkedById: number;
    linkedByEmail: string;
};

export type FileDownloadTokenPayload = {
    fileId: string;
    inline: boolean;
    exp: number;
};

export type FileIssueDownloadUrlArgs = {
    fileId: string;
    inline: boolean;
};

// Storage internals and the checksum stay on the server; dates go out as ISO strings.
type FileInternalColumns = 'storageProvider' | 'storageKey' | 'checksumSha256' | 'createdAt' | 'editedAt';

export type FileDto = Omit<FilesSchemaTypeForSelect, FileInternalColumns> & {
    createdAt: string;
    linkedTaskIds: number[];
};

export type FileListPage = {
    items: FileDto[];
    nextCursor: string | null;
};

export type FileDownloadUrl = {
    url: string;
    expiresAt: string;
};

export type FileContent = {
    file: FilesSchemaTypeForSelect;
    stream: Readable;
    sizeBytes: number;
    inline: boolean;
};

export type FileErrorCode = 'not_found' | 'forbidden' | 'too_large' | 'invalid' | 'storage_error' | 'storage_not_configured';
export const FILE_STORAGE_NOT_CONFIGURED_MESSAGE = 'File storage is not configured on this server';

export type FileStorageStatusDto = {
    enabled: boolean;
    maxFileSizeBytes: number;
};
export type FileResult<T> = { ok: true; data: T } | { ok: false; code: FileErrorCode; message?: string };

export type FileListCursor = {
    id: string;
};
