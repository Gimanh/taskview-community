import admin from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import type { NotificationsSchemaTypeForSelect } from 'taskview-db-schemas';
import type { NotificationMeta, NotificationProvider } from '../NotificationProvider';
import { NotificationChannel } from '../types';
import { DeviceTokensRepository } from '../repositories/DeviceTokensRepository';
import { $logger } from '../../../modules/logget';

export class FCMProvider implements NotificationProvider {
    readonly channel = NotificationChannel.PUSH;

    private static initialized = false;
    private static messaging: admin.messaging.Messaging | null = null;

    private readonly repo = new DeviceTokensRepository();
    private readonly enabled: boolean;

    constructor() {
        this.enabled = FCMProvider.init();
    }

    private static init(): boolean {
        if (FCMProvider.initialized) return true;

        const credentialsPath = process.env.FIREBASE_CREDENTIALS_PATH;
        if (!credentialsPath) {
            $logger.warn('[FCM] FIREBASE_CREDENTIALS_PATH not configured — push notifications disabled');
            return false;
        }

        try {
            admin.initializeApp({
                credential: admin.credential.cert(credentialsPath),
            });
            FCMProvider.messaging = getMessaging();
            FCMProvider.messaging.enableLegacyHttpTransport();
            FCMProvider.initialized = true;
            $logger.info('[FCM] Firebase initialized with legacy HTTP/1.1 transport');
            return true;
        } catch (err) {
            $logger.error(err, '[FCM] Failed to initialize Firebase');
            return false;
        }
    }

    async send(userId: number, notification: NotificationsSchemaTypeForSelect, meta: NotificationMeta): Promise<void> {
        if (!this.enabled || !FCMProvider.messaging) return;

        const tokens = await this.repo.getByUserId(userId);
        $logger.info(`[FCM] User ${userId}: found ${tokens.length} device token(s)`);
        if (tokens.length === 0) return;

        const message: admin.messaging.MulticastMessage = {
            tokens: tokens.map((t) => t.token),
            notification: {
                title: notification.title,
                body: notification.body || undefined,
            },
            data: {
                type: notification.type,
                taskId: notification.taskId ? String(notification.taskId) : '',
                goalId: String(meta.goalId),
                goalListId: meta.goalListId ? String(meta.goalListId) : '',
                organizationId: meta.organizationId ? String(meta.organizationId) : '',
                notificationId: String(notification.id),
            },
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                    },
                },
            },
        };

        try {
            $logger.info(`[FCM] Sending to ${tokens.length} token(s) for user ${userId}, title="${notification.title}"`);
            const response = await FCMProvider.messaging.sendEachForMulticast(message);
            $logger.info(`[FCM] Result: success=${response.successCount}, failure=${response.failureCount}`);

            if (response.failureCount > 0) {
                const invalidTokens: string[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const code = resp.error?.code;
                        if (code === 'messaging/invalid-registration-token' || code === 'messaging/registration-token-not-registered') {
                            invalidTokens.push(tokens[idx].token);
                        } else {
                            $logger.error(resp.error, '[FCM] Failed to send to token');
                        }
                    }
                });

                for (const token of invalidTokens) {
                    await this.repo.deleteByToken(token);
                }
            }
        } catch (err) {
            $logger.error(err, `[FCM] Failed to send multicast for user ${userId}`);
        }
    }
}
