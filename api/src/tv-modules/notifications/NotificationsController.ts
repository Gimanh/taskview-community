import { type } from 'arktype';
import type { Request, Response } from 'express';
import { CentrifugoClient } from '../../core/CentrifugoClient';

const NotificationArkTypeMarkRead = type({
    notificationId: 'number',
});

export class NotificationsController {
    fetch = async (req: Request, res: Response) => {
        const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
        return res.tvJson(await req.appUser.notificationsManager.fetchByUser(cursor));
    };

    markRead = async (req: Request, res: Response) => {
        const out = NotificationArkTypeMarkRead(req.body);
        if (out instanceof type.errors) {
            return res.status(400).send(out.summary);
        }
        return res.tvJson(await req.appUser.notificationsManager.markRead(out.notificationId));
    };

    markAllRead = async (_req: Request, res: Response) => {
        return res.tvJson(await _req.appUser.notificationsManager.markAllRead());
    };

    connectionToken = async (req: Request, res: Response) => {
        const userId = req.appUser.getUserData()?.id;
        if (!userId) {
            return res.status(401).send('Unauthorized');
        }

        const publicPort = process.env.CENTRIFUGO_PUBLIC_PORT;
        if (!publicPort) {
            return res.tvJson({ token: null, url: null });
        }

        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const parsed = new URL(appUrl);
        const protocol = parsed.protocol === 'http:' ? 'ws' : 'wss';
        const url = `${protocol}://${parsed.hostname}:${publicPort}/connection/websocket`;

        const token = CentrifugoClient.generateConnectionToken(userId);
        return res.tvJson({ token, url });
    };
}
