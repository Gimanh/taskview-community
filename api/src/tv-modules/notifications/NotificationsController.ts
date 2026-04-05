import { type } from 'arktype';
import type { Request, Response } from 'express';
import { CentrifugoClient } from '../../core/CentrifugoClient';
import { DeviceTokensRepository } from './repositories/DeviceTokensRepository';
import { UserPreferencesRepository } from './repositories/UserPreferencesRepository';
import { UserPreferences } from './UserPreferences';

const NotificationArkTypeMarkRead = type({
    notificationId: 'number',
});

const DeviceTokenArkType = type({
    token: 'string',
    platform: "'android' | 'ios'",
    timezone: 'string',
});

export class NotificationsController {
    fetch = async (req: Request, res: Response) => {
        const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
        const organizationId = req.query.organizationId ? Number(req.query.organizationId) : undefined;
        return res.tvJson(await req.appUser.notificationsManager.fetchByUser(cursor, organizationId));
    };

    markRead = async (req: Request, res: Response) => {
        const out = NotificationArkTypeMarkRead(req.body);
        if (out instanceof type.errors) {
            return res.status(400).send(out.summary);
        }
        return res.tvJson(await req.appUser.notificationsManager.markRead(out.notificationId));
    };

    markAllRead = async (req: Request, res: Response) => {
        const organizationId = req.query.organizationId ? Number(req.query.organizationId) : undefined;
        return res.tvJson(await req.appUser.notificationsManager.markAllRead(organizationId));
    };

    registerDevice = async (req: Request, res: Response) => {
        console.log('[registerDevice] body:', JSON.stringify(req.body));
        const out = DeviceTokenArkType(req.body);
        if (out instanceof type.errors) {
            console.log('[registerDevice] validation error:', out.summary);
            return res.status(400).send(out.summary);
        }
        const userId = req.appUser.getUserData()?.id;
        if (!userId) return res.status(401).send('Unauthorized');

        const repo = new DeviceTokensRepository();
        return res.tvJson(await repo.register(userId, out.token, out.platform, out.timezone));
    };

    unregisterDevice = async (req: Request, res: Response) => {
        const { token } = req.body;
        if (!token || typeof token !== 'string') {
            return res.status(400).send('token is required');
        }
        const userId = req.appUser.getUserData()?.id;
        if (!userId) return res.status(401).send('Unauthorized');

        const repo = new DeviceTokensRepository();
        return res.tvJson(await repo.unregister(userId, token));
    };

    getPreferences = async (req: Request, res: Response) => {
        const userId = req.appUser.getUserData()?.id;
        if (!userId) return res.status(400).send('Bad request');

        const repo = new UserPreferencesRepository();
        const prefs = await repo.load(userId);
        return res.tvJson({ settings: prefs.toJSON() });
    };

    savePreferences = async (req: Request, res: Response) => {
        const userId = req.appUser.getUserData()?.id;
        if (!userId) return res.status(400).send('Bad request');

        const { settings } = req.body;
        if (!settings || typeof settings !== 'object') {
            return res.status(400).send('settings is required');
        }

        const repo = new UserPreferencesRepository();
        const prefs = new UserPreferences(settings);
        const result = await repo.save(userId, prefs);
        return res.tvJson(result);
    };

    connectionToken = async (req: Request, res: Response) => {
        const userId = req.appUser.getUserData()?.id;
        if (!userId) {
            return res.status(401).send('Unauthorized');
        }

        const publicUrl = process.env.CENTRIFUGO_PUBLIC_URL;
        if (!publicUrl) {
            return res.tvJson({ token: null, url: null });
        }

        const url = publicUrl;

        const token = CentrifugoClient.generateConnectionToken(userId);
        return res.tvJson({ token, url });
    };
}
