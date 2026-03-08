import TvApiBase from "./base";
import type { AppResponse } from "./base.types";
import type {
    IntegrationArgAdd,
    IntegrationArgSelectRepo,
    IntegrationArgToggle,
    IntegrationResponseAdd,
    IntegrationResponseDelete,
    IntegrationResponseFetch,
    IntegrationResponseRepos,
    IntegrationResponseSelectRepo,
    IntegrationResponseSync,
    IntegrationResponseToggle,
} from "./integrations.types";

export default class TvIntegrationsApi extends TvApiBase {
    protected moduleUrl = '/module/integrations';

    public async fetchIntegrations(projectId: number) {
        return this.request(
            this.$axios.get<AppResponse<IntegrationResponseFetch>>(`${this.moduleUrl}`, {
                params: { projectId },
            })
        );
    }

    public async createIntegration(data: IntegrationArgAdd) {
        return this.request(
            this.$axios.post<AppResponse<IntegrationResponseAdd>>(`${this.moduleUrl}`, data)
        );
    }

    public async deleteIntegration(id: number) {
        return this.request(
            this.$axios.delete<AppResponse<IntegrationResponseDelete>>(`${this.moduleUrl}`, {
                data: { id },
            })
        );
    }

    public async toggleIntegration(data: IntegrationArgToggle) {
        return this.request(
            this.$axios.patch<AppResponse<IntegrationResponseToggle>>(`${this.moduleUrl}/toggle`, data)
        );
    }

    public async fetchRepos(integrationId: number) {
        return this.request(
            this.$axios.get<AppResponse<IntegrationResponseRepos>>(`${this.moduleUrl}/repos`, {
                params: { integrationId },
            })
        );
    }

    public async selectRepo(data: IntegrationArgSelectRepo) {
        return this.request(
            this.$axios.patch<AppResponse<IntegrationResponseSelectRepo>>(`${this.moduleUrl}/select-repo`, data)
        );
    }

    public async syncIntegration(integrationId: number) {
        return this.request(
            this.$axios.post<AppResponse<IntegrationResponseSync>>(`${this.moduleUrl}/sync`, { integrationId })
        );
    }
}
