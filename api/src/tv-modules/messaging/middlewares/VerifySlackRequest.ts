import { createHmac, timingSafeEqual } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { $logger } from '../../../modules/logget';

const MAX_AGE_SECONDS = 300;

// Verifies inbound Slack requests (slash commands, interactivity) via the app Signing
// Secret: HMAC-SHA256 over `v0:${timestamp}:${rawBody}`, compared timing-safe against the
// X-Slack-Signature header, with a 5-minute timestamp window to blunt replay.
export const VerifySlackRequest = (req: Request, res: Response, next: NextFunction) => {
    const secret = process.env.SLACK_SIGNING_SECRET;
    if (!secret) {
        $logger.error('[Messaging/Slack] SLACK_SIGNING_SECRET is not set — rejecting inbound request');
        return res.status(503).end();
    }

    const signature = req.headers['x-slack-signature'] as string | undefined;
    const timestamp = req.headers['x-slack-request-timestamp'] as string | undefined;
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
    if (!signature || !timestamp || !rawBody) return res.status(401).end();

    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > MAX_AGE_SECONDS) return res.status(401).end();

    const expected = `v0=${createHmac('sha256', secret).update(`v0:${timestamp}:${rawBody.toString('utf8')}`).digest('hex')}`;
    const expectedBuf = Buffer.from(expected);
    const signatureBuf = Buffer.from(signature);
    if (expectedBuf.length !== signatureBuf.length || !timingSafeEqual(expectedBuf, signatureBuf)) {
        return res.status(401).end();
    }
    return next();
};
