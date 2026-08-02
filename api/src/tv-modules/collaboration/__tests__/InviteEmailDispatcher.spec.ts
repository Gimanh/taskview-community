import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Email } from '../../../core/Email';
import type { AppEvents } from '../../../core/EventBus';
import { Database } from '../../../modules/db';
import { InviteEmailDispatcher } from '../InviteEmailDispatcher';

vi.mock('../../../core/Email', () => ({
    Email: {
        send: vi.fn().mockResolvedValue(true),
    },
}));

vi.mock('../../../modules/db', () => ({
    Database: {
        getInstance: vi.fn(),
    },
}));

// Each select() call consumes the next result; the returned query is both awaitable
// (count query) and .limit()-able (lookups), matching the Drizzle chains in the dispatcher
function mockDb(selectResults: unknown[][]) {
    const queue = [...selectResults];
    const insertValues = vi.fn(async () => undefined);
    const dbDrizzle = {
        select: vi.fn(() => {
            const rows = queue.shift() ?? [];
            const query = {
                limit: async () => rows,
                then: (resolve: (rows: unknown[]) => void, reject: (err: unknown) => void) =>
                    Promise.resolve(rows).then(resolve, reject),
            };
            return { from: () => ({ where: () => query }) };
        }),
        delete: vi.fn(() => ({ where: async () => undefined })),
        insert: vi.fn(() => ({ values: insertValues })),
    };
    vi.mocked(Database.getInstance).mockReturnValue({ dbDrizzle } as any);
    return { dbDrizzle, insertValues };
}

const goalRow = { name: 'Marketing', organizationId: 3 };
const inviterRow = { login: 'Alice' };
const noCooldown: unknown[] = [];
const underLimit = [{ count: 0 }];
const orgRow = [{ slug: 'acme' }];

const inviteEvent: AppEvents['collaboration.userAdded'] = {
    goalId: 42,
    email: 'invitee@example.com',
    initiatorId: 7,
    locale: 'en',
};

describe('InviteEmailDispatcher', () => {
    const dispatcher = new InviteEmailDispatcher();
    const onUserAdded = (data: typeof inviteEvent) => (dispatcher as any).onUserAdded(data);
    const sentHtml = () => (vi.mocked(Email.send).mock.calls[0][0] as any).attachment[0].data as string;

    beforeEach(() => {
        process.env.INVITE_EMAIL_ENABLED = 'true';
        process.env.SMTP_HOST = 'smtp.test';
        process.env.SMTP_FROM_EMAIL = 'noreply@test';
        process.env.APP_URL = 'http://localhost:3000';
    });

    afterEach(() => {
        delete process.env.INVITE_EMAIL_ENABLED;
        delete process.env.INVITE_EMAIL_HOURLY_LIMIT;
        vi.clearAllMocks();
    });

    it('does not send when the flag is off', async () => {
        process.env.INVITE_EMAIL_ENABLED = 'false';
        mockDb([]);

        await onUserAdded(inviteEvent);

        expect(Email.send).not.toHaveBeenCalled();
    });

    it('does not send when the flag is unset', async () => {
        delete process.env.INVITE_EMAIL_ENABLED;
        mockDb([]);

        await onUserAdded(inviteEvent);

        expect(Email.send).not.toHaveBeenCalled();
    });

    it('sends a localized email with a project deep link and records the send', async () => {
        const { insertValues } = mockDb([[goalRow], [inviterRow], noCooldown, underLimit, orgRow]);

        await onUserAdded(inviteEvent);

        expect(Email.send).toHaveBeenCalledTimes(1);
        const message = vi.mocked(Email.send).mock.calls[0][0] as any;
        expect(message.to).toBe('invitee@example.com');
        expect(message.from).toBe('noreply@test');
        expect(message.subject).toBe('Alice invited you to "Marketing" on TaskView');
        expect(message.text).toContain('http://localhost:3000/acme/42');

        const html = sentHtml();
        expect(html).toContain("You've been invited to a project");
        expect(html).toContain('Alice');
        expect(html).toContain('href="http://localhost:3000/acme/42"');

        expect(insertValues).toHaveBeenCalledWith({
            initiatorId: 7,
            email: 'invitee@example.com',
            goalId: 42,
        });
    });

    it('uses the Russian template for the ru locale', async () => {
        mockDb([[{ name: 'Маркетинг', organizationId: null }], [{ login: 'Алиса' }], noCooldown, underLimit]);

        await onUserAdded({ ...inviteEvent, locale: 'ru' });

        const message = vi.mocked(Email.send).mock.calls[0][0] as any;
        expect(message.subject).toBe('Алиса приглашает вас в проект «Маркетинг» в TaskView');
        expect(sentHtml()).toContain('Вас пригласили в проект');
        expect(sentHtml()).toContain('href="http://localhost:3000"');
    });

    it('skips the send during the per-recipient cooldown', async () => {
        const { insertValues } = mockDb([[goalRow], [inviterRow], [{ id: 1 }]]);

        await onUserAdded(inviteEvent);

        expect(Email.send).not.toHaveBeenCalled();
        expect(insertValues).not.toHaveBeenCalled();
    });

    it('skips the send when the hourly limit is reached', async () => {
        const { insertValues } = mockDb([[goalRow], [inviterRow], noCooldown, [{ count: 30 }]]);

        await onUserAdded(inviteEvent);

        expect(Email.send).not.toHaveBeenCalled();
        expect(insertValues).not.toHaveBeenCalled();
    });

    it('respects a custom INVITE_EMAIL_HOURLY_LIMIT', async () => {
        process.env.INVITE_EMAIL_HOURLY_LIMIT = '2';
        mockDb([[goalRow], [inviterRow], noCooldown, [{ count: 2 }]]);

        await onUserAdded(inviteEvent);

        expect(Email.send).not.toHaveBeenCalled();

        mockDb([[goalRow], [inviterRow], noCooldown, [{ count: 1 }], orgRow]);

        await onUserAdded(inviteEvent);

        expect(Email.send).toHaveBeenCalledTimes(1);
    });

    it('escapes user-controlled values in the html', async () => {
        mockDb([
            [{ name: '<img src=x onerror=alert(1)>', organizationId: null }],
            [{ login: 'Bob & "Co"' }],
            noCooldown,
            underLimit,
        ]);

        await onUserAdded(inviteEvent);

        const html = sentHtml();
        expect(html).not.toContain('<img src=x');
        expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
        expect(html).toContain('Bob &amp; &quot;Co&quot;');
    });

    it('is immune to $-patterns and placeholder strings in user values', async () => {
        mockDb([
            [{ name: 'Project $` name', organizationId: null }],
            [{ login: '{link}' }],
            noCooldown,
            underLimit,
        ]);

        await onUserAdded(inviteEvent);

        const html = sentHtml();
        expect(html).toContain('Project $` name');
        expect(html).toContain('{link}');
        expect(html).toContain('href="http://localhost:3000"');
    });

    it('truncates overlong user values', async () => {
        mockDb([
            [{ name: 'p'.repeat(200), organizationId: null }],
            [{ login: 'i'.repeat(200) }],
            noCooldown,
            underLimit,
        ]);

        await onUserAdded(inviteEvent);

        const message = vi.mocked(Email.send).mock.calls[0][0] as any;
        expect(message.subject).toContain(`"${'p'.repeat(80)}…"`);
        expect(message.text).toContain(`${'i'.repeat(80)}… has invited`);
    });

    it('does not send when the goal no longer exists', async () => {
        mockDb([[]]);

        await onUserAdded(inviteEvent);

        expect(Email.send).not.toHaveBeenCalled();
    });

    it('validateOnStartup rejects unrecognized values', () => {
        process.env.INVITE_EMAIL_ENABLED = 'ture';
        expect(() => InviteEmailDispatcher.validateOnStartup()).toThrow('INVITE_EMAIL_ENABLED');

        process.env.INVITE_EMAIL_ENABLED = 'false';
        expect(() => InviteEmailDispatcher.validateOnStartup()).not.toThrow();

        process.env.INVITE_EMAIL_HOURLY_LIMIT = 'abc';
        expect(() => InviteEmailDispatcher.validateOnStartup()).toThrow('INVITE_EMAIL_HOURLY_LIMIT');

        process.env.INVITE_EMAIL_HOURLY_LIMIT = '0';
        expect(() => InviteEmailDispatcher.validateOnStartup()).toThrow('INVITE_EMAIL_HOURLY_LIMIT');

        process.env.INVITE_EMAIL_HOURLY_LIMIT = '10';
        expect(() => InviteEmailDispatcher.validateOnStartup()).not.toThrow();

        delete process.env.INVITE_EMAIL_ENABLED;
        delete process.env.INVITE_EMAIL_HOURLY_LIMIT;
        expect(() => InviteEmailDispatcher.validateOnStartup()).not.toThrow();
    });
});
