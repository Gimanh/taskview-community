import { describe, expect, it } from 'vitest';
import { NotificationMailTemplate } from './NotificationMailTemplate';

describe('NotificationMailTemplate', () => {
    const content = {
        title: 'Request #4: <b>Checkout</b>\r\nBcc: someone@example.test',
        body: 'New reply from "Casey" <script>alert(1)</script>',
        link: 'https://app.example.test/acme/12/-1401/55',
    };

    it('keeps the subject on one line, so a title cannot add mail headers', () => {
        const subject = NotificationMailTemplate.subject(content);
        expect(subject).toBe('Request #4: <b>Checkout</b> Bcc: someone@example.test');
        expect(NotificationMailTemplate.subject({ ...content, title: 'a'.repeat(400) })).toHaveLength(150);
    });

    it('escapes what the notification carries and links the button to the task', () => {
        const html = NotificationMailTemplate.html(content);
        expect(html).not.toContain('<script>');
        expect(html).not.toContain('<b>Checkout</b>');
        expect(html).toContain('&lt;script&gt;');
        expect(html).toContain(`href="${content.link}"`);
    });

    it('leaves out the body and the button when there is nothing to put there', () => {
        const html = NotificationMailTemplate.html({ title: 'Deadline', body: null, link: null });
        expect(html).not.toContain('href=');
        expect(html).not.toContain('<p style="margin: 0; font-size: 14px');
        expect(NotificationMailTemplate.text({ title: 'Deadline', body: null, link: null })).toBe('Deadline');
    });
});
