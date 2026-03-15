import TvApiBase from "./base";
import type { AppResponse } from "./base.types";
import type { NotificationResponseFetch, NotificationResponseMarkRead, NotificationResponseConnectionToken } from "./notifications.api.types";

export default class TvNotificationsApi extends TvApiBase {
    protected moduleUrl = '/module/notifications';

    public async fetch(cursor?: number) {
        return this.request(
            this.$axios.get<AppResponse<NotificationResponseFetch>>(
                this.moduleUrl, { params: cursor ? { cursor } : {} }
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

    public async markAllRead() {
        return this.request(
            this.$axios.patch<AppResponse<NotificationResponseMarkRead>>(
                `${this.moduleUrl}/read-all`
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
}
