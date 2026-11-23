import { escapeHtml } from '../../utils/helpers';
import type { NotificationEmailContent } from './types';

export class NotificationMailTemplate {
    static subject(content: NotificationEmailContent): string {
        const flat = content.title.replace(/[\r\n\t]+/g, ' ').trim();
        return flat.length > 150 ? `${flat.slice(0, 149)}…` : flat;
    }

    static text(content: NotificationEmailContent): string {
        return [content.title, content.body, content.link ? `Open in TaskView: ${content.link}` : null]
            .filter(Boolean)
            .join('\n\n');
    }

    static html(content: NotificationEmailContent): string {
        const body = content.body
            ? `<tr><td style="padding: 0 32px 28px; text-align: center;"><p style="margin: 0; font-size: 14px; line-height: 1.6; color: #71717a;">${escapeHtml(content.body).replace(/\n/g, '<br />')}</p></td></tr>`
            : '';
        const button = content.link
            ? `<tr><td align="center" style="padding: 0 32px 28px;"><a href="${escapeHtml(content.link)}" style="display: inline-block; padding: 12px 32px; background-color: #16a34a; border-radius: 8px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">Open in TaskView</a></td></tr>`
            : '';
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="format-detection" content="telephone=no" />
    <meta name="color-scheme" content="only" />
    <title>${escapeHtml(content.title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f7fa;">
        <tr>
            <td align="center" style="padding: 40px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);">
                    <tr><td style="padding: 40px 32px 24px; text-align: center;"><div style="font-size: 18px; font-weight: 600; color: #000000; letter-spacing: 0.5px;">TaskView</div></td></tr>
                    <tr><td style="padding: 0 32px 16px; text-align: center;"><h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #18181b;">${escapeHtml(content.title)}</h1></td></tr>
                    ${body}
                    ${button}
                    <tr><td style="padding: 20px 32px 32px; text-align: center; border-top: 1px solid #f4f4f5;"><p style="margin: 0; font-size: 12px; line-height: 1.5; color: #a1a1aa;">You get this letter because email notifications are switched on in your TaskView account settings.</p></td></tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
    }
}
