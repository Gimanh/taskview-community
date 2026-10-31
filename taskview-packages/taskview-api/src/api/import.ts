import TvApiBase from './base';
import type { AppResponse } from '@/api/base.types';
import type {
    ImportArgCreateJob,
    ImportArgProjectMeta,
    ImportArgStart,
    ImportJob,
    ImportProjectMeta,
    ImportProviderInfo,
    ImportRemoteProject,
} from './import.types';

export default class TvImport extends TvApiBase {
    protected moduleUrl = '/module/import';

    public async fetchProviders() {
        return this.request(
            this.$axios.get<AppResponse<ImportProviderInfo[]>>(`${this.moduleUrl}/providers`)
        );
    }

    public async fetchJobs(organizationId: number) {
        return this.request(
            this.$axios.get<AppResponse<ImportJob[]>>(`${this.moduleUrl}/jobs`, { params: { organizationId } })
        );
    }

    public async fetchJob(id: number) {
        return this.request(
            this.$axios.get<AppResponse<ImportJob>>(`${this.moduleUrl}/jobs/${id}`)
        );
    }

    public async createJob(data: ImportArgCreateJob) {
        return this.request(
            this.$axios.post<AppResponse<ImportJob>>(`${this.moduleUrl}/jobs`, data)
        );
    }

    public async fetchRemoteProjects(id: number) {
        return this.request(
            this.$axios.get<AppResponse<ImportRemoteProject[]>>(`${this.moduleUrl}/jobs/${id}/projects`)
        );
    }

    public async fetchProjectMeta(data: ImportArgProjectMeta) {
        return this.request(
            this.$axios.get<AppResponse<ImportProjectMeta>>(
                `${this.moduleUrl}/jobs/${data.id}/projects/${encodeURIComponent(data.externalId)}`
            )
        );
    }

    public async start(data: ImportArgStart) {
        const { id, ...body } = data;
        return this.request(
            this.$axios.post<AppResponse<ImportJob>>(`${this.moduleUrl}/jobs/${id}/start`, body)
        );
    }

    public async cancel(id: number) {
        return this.request(
            this.$axios.post<AppResponse<ImportJob>>(`${this.moduleUrl}/jobs/${id}/cancel`)
        );
    }
}
