import { afterEach, describe, expect, it } from 'vitest';
import { TrelloProvider } from '../providers/trello/TrelloProvider';

const validOptions = {
    listAs: 'list',
    checklistsAs: 'note',
    includeArchived: true,
    commentsToNote: false,
    includeAttachments: false,
};

describe('TrelloProvider', () => {
    const provider = new TrelloProvider();

    afterEach(() => {
        delete process.env.TRELLO_API_KEY;
    });

    it('rebuilds options from known keys only', () => {
        const result = provider.sanitizeOptions({ ...validOptions, __proto__polluted: true, extra: 'x' });
        expect(result).toEqual({ ok: true, options: validOptions });
    });

    it('rejects options with wrong values', () => {
        expect(provider.sanitizeOptions({ ...validOptions, listAs: 'board' }).ok).toBe(false);
        expect(provider.sanitizeOptions({ listAs: 'list' }).ok).toBe(false);
    });

    it('defaults match the declared option fields', () => {
        expect(provider.defaultOptions()).toEqual({
            listAs: 'status',
            checklistsAs: 'subtasks',
            includeArchived: false,
            commentsToNote: true,
            includeAttachments: true,
        });
        expect(provider.sanitizeOptions(provider.defaultOptions()).ok).toBe(true);
    });

    it('offers only manual credentials without a server API key', () => {
        const auth = provider.auth();
        expect(auth.popupAuthorizeUrl).toBeNull();
        expect(auth.popupCredentialKey).toBeNull();
        expect(auth.manualFields.map((field) => field.key)).toEqual(['apiKey', 'token']);
    });

    it('builds a read-only popup authorize URL from the server API key', () => {
        process.env.TRELLO_API_KEY = 'a'.repeat(32);
        const url = new URL(provider.auth().popupAuthorizeUrl!);

        expect(url.origin + url.pathname).toBe('https://trello.com/1/authorize');
        expect(url.searchParams.get('key')).toBe('a'.repeat(32));
        expect(url.searchParams.get('scope')).toBe('read');
        expect(url.searchParams.get('callback_method')).toBe('fragment');
        expect(provider.auth().popupCredentialKey).toBe('token');
    });

    it('ignores a malformed server API key', () => {
        process.env.TRELLO_API_KEY = 'bad key"\r\nX-Injected: 1';
        expect(provider.auth().popupAuthorizeUrl).toBeNull();
    });

    it('rejects malformed credentials without calling Trello', async () => {
        const result = await provider.validateCredentials({ credentials: { apiKey: 'short', token: 'x"\r\n' } });
        expect(result).toEqual({ ok: false, code: 'invalid_credentials' });
    });
});
