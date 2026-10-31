import { describe, expect, it } from 'vitest';
import { TodoistProvider } from '../providers/todoist/TodoistProvider';

const validOptions = {
    sectionsAs: 'list',
    includeCompleted: false,
    commentsToNote: false,
    includeAttachments: false,
};

describe('TodoistProvider', () => {
    const provider = new TodoistProvider();

    it('rebuilds options from known keys only', () => {
        const result = provider.sanitizeOptions({ ...validOptions, extra: 'x' });
        expect(result).toEqual({ ok: true, options: validOptions });
    });

    it('rejects options with wrong values', () => {
        expect(provider.sanitizeOptions({ ...validOptions, sectionsAs: 'board' }).ok).toBe(false);
        expect(provider.sanitizeOptions({ sectionsAs: 'list' }).ok).toBe(false);
    });

    it('defaults match the declared option fields', () => {
        expect(provider.defaultOptions()).toEqual({
            sectionsAs: 'status',
            includeCompleted: true,
            commentsToNote: true,
            includeAttachments: true,
        });
        expect(provider.sanitizeOptions(provider.defaultOptions()).ok).toBe(true);
    });

    it('asks only for a personal API token', () => {
        const auth = provider.auth();
        expect(auth.popupAuthorizeUrl).toBeNull();
        expect(auth.manualFields).toEqual([{ key: 'token', secret: true }]);
    });

    it('rejects malformed tokens without calling Todoist', async () => {
        await expect(provider.validateCredentials({ credentials: { token: 'short' } })).resolves.toEqual({
            ok: false,
            code: 'invalid_credentials',
        });
        await expect(provider.validateCredentials({ credentials: { token: `${'a'.repeat(40)}\n` + 'x' } })).resolves.toEqual({
            ok: false,
            code: 'invalid_credentials',
        });
    });

    it('downloads only from the Todoist files host', async () => {
        const reader = provider.createReader({
            credentials: { token: 'a'.repeat(40) },
            externalProjectId: 'p1',
            options: provider.defaultOptions(),
            locale: 'en',
        });
        const attachment = { externalId: 'c1', name: 'a', mimeType: 'text/plain', sizeBytes: 1 };
        for (const url of ['http://files.todoist.com/a', 'https://evil.example.com/a', 'https://files.todoist.com.evil.com/a']) {
            await expect(reader.downloadAttachment({ ...attachment, downloadRef: JSON.stringify({ url }) })).rejects.toMatchObject({
                code: 'not_found',
            });
        }
    });
});
