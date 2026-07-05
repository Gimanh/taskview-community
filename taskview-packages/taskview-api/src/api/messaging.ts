import TvApiBase from './base';
import type { AppResponse } from '@/api/base.types';
import type {
    MessagingArgDelete,
    MessagingArgProjectDelete,
    MessagingArgProjectToggle,
    MessagingArgToggle,
    MessagingConnectLinkResult,
    MessagingConnectionItem,
    MessagingProviderId,
} from './messaging.types';

export default class TvMessagingApi extends TvApiBase {
    protected moduleUrl = '/module/messaging';

    public async fetch() {
        return this.request(
            this.$axios.get<AppResponse<MessagingConnectionItem[]>>(`${this.moduleUrl}`)
        );
    }

    public async connectLink(provider: MessagingProviderId) {
        return this.request(
            this.$axios.get<AppResponse<MessagingConnectLinkResult>>(`${this.moduleUrl}/${provider}/connect-link`)
        );
    }

    public async toggle(data: MessagingArgToggle) {
        return this.request(
            this.$axios.patch<AppResponse<MessagingConnectionItem>>(`${this.moduleUrl}/toggle`, data)
        );
    }

    public async updateEvents(data: { id: number; events: string[] }) {
        return this.request(
            this.$axios.patch<AppResponse<MessagingConnectionItem>>(`${this.moduleUrl}/events`, data)
        );
    }

    public async delete(data: MessagingArgDelete) {
        return this.request(
            this.$axios.delete<AppResponse<boolean>>(`${this.moduleUrl}`, { data })
        );
    }

    public async fetchProject(goalId: number) {
        return this.request(
            this.$axios.get<AppResponse<MessagingConnectionItem[]>>(`${this.moduleUrl}/project`, { params: { goalId } })
        );
    }

    public async projectConnectLink(provider: MessagingProviderId, goalId: number) {
        return this.request(
            this.$axios.get<AppResponse<MessagingConnectLinkResult>>(`${this.moduleUrl}/project/${provider}/connect-link`, { params: { goalId } })
        );
    }

    public async toggleProject(data: MessagingArgProjectToggle) {
        return this.request(
            this.$axios.patch<AppResponse<MessagingConnectionItem>>(`${this.moduleUrl}/project/toggle`, data)
        );
    }

    public async updateProjectEvents(data: { id: number; goalId: number; events: string[] }) {
        return this.request(
            this.$axios.patch<AppResponse<MessagingConnectionItem>>(`${this.moduleUrl}/project/events`, data)
        );
    }

    public async updateProjectPostContent(data: { id: number; goalId: number; postContent: boolean }) {
        return this.request(
            this.$axios.patch<AppResponse<MessagingConnectionItem>>(`${this.moduleUrl}/project/post-content`, data)
        );
    }

    public async deleteProject(data: MessagingArgProjectDelete) {
        return this.request(
            this.$axios.delete<AppResponse<boolean>>(`${this.moduleUrl}/project`, { data })
        );
    }
}
