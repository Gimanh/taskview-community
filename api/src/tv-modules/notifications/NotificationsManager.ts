import type { AppUser } from '../../core/AppUser';
import { NotificationsRepository } from './NotificationsRepository';

export class NotificationsManager {
    private readonly user: AppUser;
    public readonly repository: NotificationsRepository;

    constructor(user: AppUser) {
        this.user = user;
        this.repository = new NotificationsRepository();
    }

    async fetchByUser(cursor?: number) {
        const userId = this.user.getUserData()?.id;
        if (!userId) return { notifications: [] };
        const notifications = await this.repository.fetchByUser(userId, cursor);
        return { notifications };
    }

    async markRead(notificationId: number) {
        const userId = this.user.getUserData()?.id;
        if (!userId) return false;
        return this.repository.markRead(notificationId, userId);
    }

    async markAllRead() {
        const userId = this.user.getUserData()?.id;
        if (!userId) return false;
        return this.repository.markAllRead(userId);
    }
}
