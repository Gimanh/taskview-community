import { timingSafeEqual } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { $logger } from '../../../modules/logget';

/**
 * Telegram sends the value configured via setWebhook's secret_token in this
 * header on every update. Reject anything that doesn't match so the public
 * inbound endpoint can't be spoofed.
 */
export function VerifyTelegramWebhook(req: Request, res: Response, next: NextFunction) {
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!expected) {
        $logger.warn('[Messaging/Telegram] webhook rejected: TELEGRAM_WEBHOOK_SECRET not set');
        return res.status(503).end();
    }

    const provided = req.header('X-Telegram-Bot-Api-Secret-Token') ?? '';
    if (!safeEqual(provided, expected)) {
        $logger.warn({ hasHeader: !!req.header('X-Telegram-Bot-Api-Secret-Token') }, '[Messaging/Telegram] webhook rejected: secret mismatch');
        return res.status(401).end();
    }

    return next();
}

function safeEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    try {
        return timingSafeEqual(aBuf, bBuf);
    } catch {
        return false;
    }
}
