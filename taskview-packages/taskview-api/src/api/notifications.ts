import TvApiBase from "./base";
import type { AppResponse } from "./base.types";
import type { NotificationResponseFetch, NotificationResponseMarkRead, NotificationResponseConnectionToken, NotificationResponsePreferences, NotificationPreferencesSettings } from "./notifications.api.types";

export default class TvNotificationsApi extends TvApiBase {
    protected moduleUrl = '/module/notifications';

    public async fetch(cursor?: number, organizationId?: number) {
        const params: Record<string, number> = {};
        if (cursor) params.cursor = cursor;
        if (organizationId) params.organizationId = organizationId;
        return this.request(
            this.$axios.get<AppResponse<NotificationResponseFetch>>(
                this.moduleUrl, { params }
            )
        );
    }

    public async markRead(notificationId: number) {
        return this.request(
            this.$axios.patch<AppResponse<NotificationResponseMarkRead>>(
                `${this.moduleUrl}/read`, { notificationId }
            )
        );
    }

    public async markAllRead(organizationId?: number) {
        const params = organizationId ? { organizationId } : undefined;
        return this.request(
            this.$axios.patch<AppResponse<NotificationResponseMarkRead>>(
                `${this.moduleUrl}/read-all`, undefined, params ? { params } : undefined
            )
        );
    }

    public async getConnectionToken() {
        return this.request(
            this.$axios.get<AppResponse<NotificationResponseConnectionToken>>(
                `${this.moduleUrl}/connection-token`
            )
        );
    }

    public async registerDevice(token: string, platform: 'android' | 'ios', timezone: string) {
        return this.request(
            this.$axios.post<AppResponse<boolean>>(
                `${this.moduleUrl}/device/register`, { token, platform, timezone }
            )
        );
    }

    public async unregisterDevice(token: string) {
        return this.request(
            this.$axios.post<AppResponse<boolean>>(
                `${this.moduleUrl}/device/unregister`, { token }
            )
        );
    }

    public async getPreferences() {
        return this.request(
            this.$axios.get<AppResponse<NotificationResponsePreferences>>(
                `${this.moduleUrl}/preferences`
            )
        );
    }

    public async savePreferences(settings: NotificationPreferencesSettings) {
        return this.request(
            this.$axios.put<AppResponse<boolean>>(
                `${this.moduleUrl}/preferences`, { settings }
            )
        );
    }
}
