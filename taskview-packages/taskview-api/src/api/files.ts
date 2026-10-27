import TvApiBase from './base';
import type { AppResponse } from './base.types';
import type {
    TvFile,
    TvFileDownloadUrl,
    TvFileDownloadUrlArgs,
    TvFileLinkArgs,
    TvFileListArgs,
    TvFileListPage,
    TvFileQuota,
    TvFileRenameArgs,
    TvFileStorageStatus,
    TvFileUnlinkArgs,
    TvFileUploadArgs,
} from './files.types';

export default class TvFilesApi extends TvApiBase {
    protected moduleUrl = '/module/files';

    public async quota(goalId: number) {
        return this.request(this.$axios.get<AppResponse<TvFileQuota>>(`${this.moduleUrl}/goal/${goalId}/quota`));
    }

    public async status() {
        return this.request(this.$axios.get<AppResponse<TvFileStorageStatus>>(`${this.moduleUrl}/status`));
    }

    public async upload(args: TvFileUploadArgs) {
        const form = new FormData();
        form.append('file', args.file, args.fileName);
        const query = args.taskId !== null ? `?taskId=${args.taskId}` : '';
        return this.request(
            this.$axios.post<AppResponse<TvFile>>(`${this.moduleUrl}/goal/${args.goalId}${query}`, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
                signal: args.signal,
                onUploadProgress: (event) => {
                    if (!args.onProgress) return;
                    const total = event.total ?? args.file.size;
                    args.onProgress(total > 0 ? Math.min(100, Math.round((event.loaded / total) * 100)) : 0);
                },
            })
        );
    }

    public async listForGoal(args: TvFileListArgs) {
        const params = new URLSearchParams();
        if (args.search) params.set('search', args.search);
        if (args.type) params.set('type', args.type);
        if (args.cursor) params.set('cursor', args.cursor);
        if (args.limit) params.set('limit', String(args.limit));
        const query = params.toString();
        return this.request(
            this.$axios.get<AppResponse<TvFileListPage>>(`${this.moduleUrl}/goal/${args.goalId}${query ? `?${query}` : ''}`)
        );
    }

    public async listForTask(taskId: number) {
        return this.request(this.$axios.get<AppResponse<TvFile[]>>(`${this.moduleUrl}/task/${taskId}`));
    }

    public async getById(fileId: string) {
        return this.request(this.$axios.get<AppResponse<TvFile>>(`${this.moduleUrl}/file/${fileId}`));
    }

    public async link(args: TvFileLinkArgs) {
        return this.request(
            this.$axios.post<AppResponse<TvFile[]>>(`${this.moduleUrl}/task/${args.taskId}/link`, { fileIds: args.fileIds })
        );
    }

    public async unlink(args: TvFileUnlinkArgs) {
        return this.request(this.$axios.delete<AppResponse<null>>(`${this.moduleUrl}/task/${args.taskId}/file/${args.fileId}`));
    }

    public async rename(args: TvFileRenameArgs) {
        return this.request(this.$axios.patch<AppResponse<TvFile>>(`${this.moduleUrl}/file/${args.fileId}`, { name: args.name }));
    }

    public async deleteForever(fileId: string) {
        return this.request(this.$axios.delete<AppResponse<null>>(`${this.moduleUrl}/file/${fileId}`));
    }

    public async downloadUrl(args: TvFileDownloadUrlArgs) {
        return this.request(
            this.$axios.post<AppResponse<TvFileDownloadUrl>>(`${this.moduleUrl}/file/${args.fileId}/download-url`, {
                inline: args.inline,
            })
        );
    }
}
