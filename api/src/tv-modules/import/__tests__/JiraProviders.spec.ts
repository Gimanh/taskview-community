import { afterEach, describe, expect, it } from 'vitest';
import { JiraCloudProvider } from '../providers/jira-cloud/JiraCloudProvider';
import { JiraDcProvider } from '../providers/jira-dc/JiraDcProvider';

const options = { epicsAs: 'task', includeDone: false, commentsToNote: false, includeAttachments: false };
const token = 'A'.repeat(40);

describe('JiraCloudProvider', () => {
    const provider = new JiraCloudProvider();

    it('asks for site, email and API token', () => {
        expect(provider.auth().manualFields).toEqual([
            { key: 'siteUrl', secret: false },
            { key: 'email', secret: false },
            { key: 'token', secret: true },
        ]);
    });

    it('rebuilds options from known keys and keeps defaults valid', () => {
        expect(provider.sanitizeOptions({ ...options, extra: 1 })).toEqual({ ok: true, options });
        expect(provider.sanitizeOptions({ ...options, epicsAs: 'board' }).ok).toBe(false);
        expect(provider.sanitizeOptions(provider.defaultOptions()).ok).toBe(true);
    });

    it('accepts only https://<name>.atlassian.net sites without calling Jira', async () => {
        for (const siteUrl of ['http://acme.atlassian.net', 'https://acme.atlassian.net.evil.com', 'https://evil.com', 'https://a.b.atlassian.net', 'https://acme.atlassian.net:8443']) {
            await expect(provider.validateCredentials({ credentials: { siteUrl, email: 'a@b.co', token } })).resolves.toEqual({ ok: false, code: 'invalid_url' });
        }
    });

    it('rejects malformed email or token without calling Jira', async () => {
        const siteUrl = 'acme.atlassian.net';
        await expect(provider.validateCredentials({ credentials: { siteUrl, email: 'no-at', token } })).resolves.toEqual({ ok: false, code: 'invalid_credentials' });
        await expect(provider.validateCredentials({ credentials: { siteUrl, email: 'a@b.co', token: 'short' } })).resolves.toEqual({
            ok: false,
            code: 'invalid_credentials',
        });
    });

    it('downloads attachments only by numeric id', async () => {
        const reader = provider.createReader({
            credentials: { siteUrl: 'https://acme.atlassian.net', email: 'a@b.co', token },
            externalProjectId: '100',
            options: provider.defaultOptions(),
            locale: 'en',
        });
        const attachment = { externalId: '1', name: 'a', mimeType: 'text/plain', sizeBytes: 1, downloadRef: JSON.stringify({ id: '../../myself' }) };
        await expect(reader.downloadAttachment(attachment)).rejects.toMatchObject({ code: 'not_found' });
    });
});

describe('JiraDcProvider', () => {
    const provider = new JiraDcProvider();
    const saved = process.env.IMPORT_ALLOW_PRIVATE_URLS;

    afterEach(() => {
        if (saved === undefined) delete process.env.IMPORT_ALLOW_PRIVATE_URLS;
        else process.env.IMPORT_ALLOW_PRIVATE_URLS = saved;
    });

    it('asks for the Jira address and a personal access token', () => {
        expect(provider.auth().manualFields).toEqual([
            { key: 'siteUrl', secret: false },
            { key: 'token', secret: true },
        ]);
        expect(provider.sanitizeOptions({ ...options, extra: 1 })).toEqual({ ok: true, options });
    });

    it('refuses private addresses unless IMPORT_ALLOW_PRIVATE_URLS is set', async () => {
        delete process.env.IMPORT_ALLOW_PRIVATE_URLS;
        for (const siteUrl of ['http://127.0.0.1:8080/jira', 'http://10.0.0.5', 'http://localhost:8080', 'http://169.254.169.254']) {
            await expect(provider.validateCredentials({ credentials: { siteUrl, token } })).resolves.toEqual({ ok: false, code: 'private_url' });
        }
    });

    it('rejects malformed addresses and tokens', async () => {
        await expect(provider.validateCredentials({ credentials: { siteUrl: 'ftp://jira.acme.io', token } })).resolves.toEqual({ ok: false, code: 'invalid_url' });
        await expect(provider.validateCredentials({ credentials: { siteUrl: 'https://user:pw@jira.acme.io', token } })).resolves.toEqual({
            ok: false,
            code: 'invalid_url',
        });
        await expect(provider.validateCredentials({ credentials: { siteUrl: 'https://jira.acme.io', token: 'bad token' } })).resolves.toEqual({
            ok: false,
            code: 'invalid_credentials',
        });
    });

    it('rejects attachment references that are not an id and a file name', async () => {
        const reader = provider.createReader({
            credentials: { siteUrl: 'https://jira.acme.io/jira/browse/OPS-1', token },
            externalProjectId: '200',
            options: provider.defaultOptions(),
            locale: 'en',
        });
        for (const ref of [{ id: 'x', filename: 'a' }, { id: '1', filename: '' }, { id: '1' }]) {
            const attachment = { externalId: '1', name: 'a', mimeType: 'text/plain', sizeBytes: 1, downloadRef: JSON.stringify(ref) };
            await expect(reader.downloadAttachment(attachment)).rejects.toMatchObject({ code: 'not_found' });
        }
    });
});
