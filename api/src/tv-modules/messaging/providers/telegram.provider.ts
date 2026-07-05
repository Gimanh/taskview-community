import { randomBytes } from 'crypto';
import { $logger } from '../../../modules/logget';
import type { MessagingProvider } from './MessagingProvider';
import type { MessagingDeliverArgs, MessagingDeliverResult, MessagingMessage, MessagingProviderId } from '../types';
import type { ConnectContext, ConnectStart, InboundIntent, InboundRaw, TelegramInboundMessage } from '../types.internal';
import { LINK_TTL_MS, TELEGRAM_API } from '../config';
import { escapeHtml, isSafeUrl } from '../utils';

/**
 * Telegram bot provider. The bot token is instance-level (env), so the SaaS
 * ships an official bot and self-hosted installs supply their own via
 * TELEGRAM_BOT_TOKEN — no code fork, only config.
 */
export class TelegramProvider implements MessagingProvider {
    readonly id: MessagingProviderId = 'telegram';

    isConfigured(): boolean {
        return !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_BOT_USERNAME;
    }

    async deliver(args: MessagingDeliverArgs): Promise<MessagingDeliverResult> {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) return { success: false };

        try {
            const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: args.chatId,
                    text: this.render(args.message),
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                }),
                signal: AbortSignal.timeout(10000),
            });
            return { success: response.ok, errorCode: response.ok ? undefined : response.status };
        } catch (err) {
            // Log only the message — the raw error can carry the request URL, which
            // embeds the bot token.
            const message = err instanceof Error ? err.message : 'unknown error';
            $logger.error({ message }, `[Messaging/Telegram] Delivery failed to chat=${args.chatId}`);
            return { success: false };
        }
    }

    async startConnect(ctx: ConnectContext): Promise<ConnectStart> {
        const username = process.env.TELEGRAM_BOT_USERNAME;
        const token = randomBytes(24).toString('hex');
        const expiresAt = new Date(Date.now() + LINK_TTL_MS);
        // Personal → deep-link into a private chat (auto-sends /start <token>).
        // Project → startgroup lets the admin add the bot to a group; the bind completes
        // when they run /connect <token> there.
        const url = ctx.ownerType === 'user'
            ? `https://t.me/${username}?start=${token}`
            : `https://t.me/${username}?startgroup=${token}`;
        return { kind: 'deep-link', url, persistToken: { token, expiresAt } };
    }

    async parseInbound(raw: InboundRaw): Promise<InboundIntent | null> {
        if (raw.source !== 'webhook') return null;
        const message = (raw.payload as { message?: TelegramInboundMessage })?.message;
        if (!message) return null;

        const text = typeof message.text === 'string' ? message.text.trim() : '';
        const chatId = message.chat?.id;
        const chatType = message.chat?.type;
        const fromId = message.from?.id;
        if (!text || text.length > 4096 || typeof chatId !== 'number' || typeof fromId !== 'number') return null;

        // /task <description> — create a task in this chat's project.
        const taskMatch = text.match(/^\/task(?:@\w+)?\s+([\s\S]+)$/);
        if (taskMatch) {
            return { kind: 'command', command: 'createTask', text: taskMatch[1].trim().slice(0, 2000), chatId: String(chatId), externalUserId: String(fromId) };
        }

        const match = text.match(/^\/(?:start|connect)(?:@\w+)?\s+(\S+)$/);
        if (!match) return null;

        if (chatType === 'private') {
            const title = typeof message.from?.username === 'string' ? `@${message.from.username}` : null;
            return { kind: 'bindByToken', token: match[1], scope: 'user', chatId: String(chatId), externalUserId: String(fromId), title };
        }
        if (chatType === 'group' || chatType === 'supergroup') {
            const title = typeof message.chat?.title === 'string' ? message.chat.title : null;
            return { kind: 'bindByToken', token: match[1], scope: 'project', chatId: String(chatId), externalUserId: String(fromId), title };
        }
        return null;
    }

    private render(message: MessagingMessage): string {
        // Mirror the Slack layout: task name (bold) on top, the "[event] [project]" label as
        // the link below, assignees last. Telegram has no header size, so name is just bold.
        const url = message.url && isSafeUrl(message.url) ? message.url : undefined;
        const lines: string[] = [];

        if (message.body) lines.push(`<b>${escapeHtml(message.body)}</b>`);

        const label = escapeHtml(message.title);
        lines.push(url ? `<a href="${escapeHtml(url)}">${label}</a>` : label);

        if (message.footer) lines.push(escapeHtml(message.footer));
        return lines.join('\n');
    }
}
