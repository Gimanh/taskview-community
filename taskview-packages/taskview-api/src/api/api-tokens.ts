import TvApiBase from './base';
import type { AppResponse } from '@/api/base.types';
import type {
    ApiTokenArgCreate,
    ApiTokenCreateResponse,
    ApiTokenItem,
    ApiTokenPermission,
} from './api-tokens.types';

export default class TvApiTokens extends TvApiBase {
    protected moduleUrl = '/module/api-tokens';

    public async fetch() {
        return this.request(
            this.$axios.get<AppResponse<ApiTokenItem[]>>(`${this.moduleUrl}`)
        );
    }

    public async create(data: ApiTokenArgCreate) {
        return this.request(
            this.$axios.post<AppResponse<ApiTokenCreateResponse>>(`${this.moduleUrl}`, data)
        );
    }

    public async delete(id: number) {
        return this.request(
            this.$axios.delete<AppResponse<boolean>>(`${this.moduleUrl}`, { data: { id } })
        );
    }

    public async fetchPermissions() {
        return this.request(
            this.$axios.get<AppResponse<ApiTokenPermission[]>>(`${this.moduleUrl}/permissions`)
        );
    }
}
