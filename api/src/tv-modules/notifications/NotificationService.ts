import { $logger } from '../../modules/logget';
import type { NotificationMeta, NotificationProvider } from './NotificationProvider';
import type { NotificationMessage } from './types';
import { NotificationsRepository } from './repositories/NotificationsRepository';
import { UserPreferencesRepository } from './repositories/UserPreferencesRepository';
import { NotificationChannel, type NotificationType } from './types';
import { CentrifugoProvider } from './providers/CentrifugoProvider';
import { FCMProvider } from './providers/FCMProvider';

export class NotificationService {
    private readonly providers: Map<NotificationChannel, NotificationProvider>;
    private readonly repo: NotificationsRepository;
    private readonly preferences: UserPreferencesRepository;

    constructor() {
        this.repo = new NotificationsRepository();
        this.preferences = new UserPreferencesRepository();

        const providerList: NotificationProvider[] = [
            new CentrifugoProvider(),
            new FCMProvider(),
        ];

        this.providers = new Map();
        for (const p of providerList) {
            this.providers.set(p.channel, p);
        }
    }

    async notify(
        userId: number,
        type: NotificationType,
        message: NotificationMessage,
        meta: NotificationMeta,
        taskId: number | null = null,
    ): Promise<void> {
        $logger.info(`[NotificationService] notify user=${userId}, type=${type}, title="${message.title}"`);

        const channels = await this.preferences.getEnabledChannels(userId, type, meta.goalId);
        if (channels.length === 0) {
            $logger.info(`[NotificationService] All channels disabled for user=${userId}, type=${type}`);
            return;
        }

        const notification = await this.repo.create({ userId, taskId, type, title: message.title, body: message.body });
        if (!notification) {
            $logger.warn(`[NotificationService] Failed to create notification record for user ${userId}`);
            return;
        }

        $logger.info(`[NotificationService] Created notification id=${notification.id}, sending to channels=[${channels.join(',')}]`);

        await Promise.allSettled(
            channels
                .map((channel) => this.providers.get(channel))
                .filter(Boolean)
                .map((provider) =>
                    provider!.send(userId, notification, meta).catch((err) => {
                        $logger.error(err, `[NotificationService] Provider "${provider!.channel}" failed for user ${userId}`);
                    })
                )
        );
    }

    async notifyMany(
        userIds: number[],
        type: NotificationType,
        message: NotificationMessage,
        meta: NotificationMeta,
        taskId: number | null = null,
    ): Promise<void> {
        await Promise.allSettled(
            userIds.map((userId) => this.notify(userId, type, message, meta, taskId))
        );
    }
}

let _instance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
    if (!_instance) {
        _instance = new NotificationService();
    }
    return _instance;
}
