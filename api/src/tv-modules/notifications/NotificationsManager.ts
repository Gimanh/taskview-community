import type { AppUser } from '../../core/AppUser';
import { NotificationsRepository } from './repositories/NotificationsRepository';

export class NotificationsManager {
    private readonly user: AppUser;
    public readonly repository: NotificationsRepository;

    constructor(user: AppUser) {
        this.user = user;
        this.repository = new NotificationsRepository();
    }

    async fetchByUser(cursor?: number, organizationId?: number) {
        const userId = this.user.getUserData()?.id;
        if (!userId) return { notifications: [] };
        const notifications = await this.repository.fetchByUser(userId, cursor, organizationId);
        return { notifications };
    }

    async markRead(notificationId: number) {
        const userId = this.user.getUserData()?.id;
        if (!userId) return false;
        return this.repository.markRead(notificationId, userId);
    }

    async markAllRead(organizationId?: number) {
        const userId = this.user.getUserData()?.id;
        if (!userId) return false;
        return this.repository.markAllRead(userId, organizationId);
    }
}
