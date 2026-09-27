export type TvFileKindFilter = 'image' | 'document' | 'all';

export type TvFile = {
    id: string;
    goalId: number;
    name: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    uploaderId: number | null;
    uploaderEmail: string;
    createdAt: string;
    linkedTaskIds: number[];
};

export type TvFileListPage = {
    items: TvFile[];
    nextCursor: string | null;
};

export type TvFileDownloadUrl = {
    url: string;
    expiresAt: string;
};

export type TvFileListArgs = {
    goalId: number;
    search?: string | null;
    type?: TvFileKindFilter;
    cursor?: string | null;
    limit?: number;
};

export type TvFileUploadArgs = {
    goalId: number;
    taskId: number | null;
    file: Blob;
    fileName: string;
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
};

export type TvFileLinkArgs = {
    taskId: number;
    fileIds: string[];
};

export type TvFileUnlinkArgs = {
    taskId: number;
    fileId: string;
};

export type TvFileRenameArgs = {
    fileId: string;
    name: string;
};

export type TvFileDownloadUrlArgs = {
    fileId: string;
    inline: boolean;
};
