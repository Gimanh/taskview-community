import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'http';
import type { AddressInfo } from 'net';
import { promises as dns } from 'dns';
import { WebhooksManager } from '../WebhooksManager';
import { WebhooksRepository } from '../WebhooksRepository';
import { parseWebhookUrl, validateWebhooksEnvOnStartup } from '../webhooks.utils';

const undiciFetch = vi.hoisted(() => ({ mock: vi.fn(), actual: null as typeof import('undici').fetch | null }));

vi.mock('undici', async (importOriginal) => {
    const actual = await importOriginal<typeof import('undici')>();
    undiciFetch.actual = actual.fetch;
    return { ...actual, fetch: undiciFetch.mock };
});

vi.mock('../../../modules/db', () => ({
    Database: {
        getInstance: vi.fn(() => ({ dbDrizzle: {} })),
    },
}));

// GHSA-pm9j-4pmg-mp5x: outgoing webhook URLs were passed straight to fetch(),
// so a project owner could point a webhook at loopback / private / cloud-metadata
// addresses and make the server POST there (blind SSRF).
describe('Webhooks SSRF protection (GHSA-pm9j-4pmg-mp5x)', () => {
    const secret = 'a'.repeat(64);
    const payload = { event: 'webhook.test', data: {} };

    let server: Server;
    let port: number;
    let receivedRequests: { url: string; method: string }[];

    beforeAll(async () => {
        process.env.ENCRYPTION_KEY = 'f'.repeat(64);
        server = createServer((req, res) => {
            receivedRequests.push({ url: req.url ?? '', method: req.method ?? '' });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end('{"secret":"internal"}');
        });
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
        port = (server.address() as AddressInfo).port;
    });

    afterAll(async () => {
        await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    });

    beforeEach(() => {
        receivedRequests = [];
        undiciFetch.mock.mockReset();
        undiciFetch.mock.mockImplementation(undiciFetch.actual!);
    });

    afterEach(() => {
        delete process.env.WEBHOOKS_ALLOW_PRIVATE_URLS;
        vi.restoreAllMocks();
    });

    describe('deliver()', () => {
        it('does not POST to a loopback IP address', async () => {
            const manager = new WebhooksManager();

            const result = await manager.deliver(`http://127.0.0.1:${port}/internal-admin`, secret, payload);

            expect(receivedRequests).toEqual([]);
            expect(result.success).toBe(false);
        });

        it('does not POST to a hostname that resolves to a loopback address', async () => {
            const manager = new WebhooksManager();

            const result = await manager.deliver(`http://localhost:${port}/internal-admin`, secret, payload);

            expect(receivedRequests).toEqual([]);
            expect(result.success).toBe(false);
        });

        it('does not POST to the cloud metadata endpoint', async () => {
            const manager = new WebhooksManager();

            const result = await manager.deliver('http://169.254.169.254/latest/meta-data/iam/security-credentials/', secret, payload);

            expect(undiciFetch.mock).not.toHaveBeenCalled();
            expect(result.success).toBe(false);
        });

        it('does not POST to a private network address', async () => {
            const manager = new WebhooksManager();

            const result = await manager.deliver('http://10.0.0.5:8080/', secret, payload);

            expect(undiciFetch.mock).not.toHaveBeenCalled();
            expect(result.success).toBe(false);
        });

        it('does not follow a redirect from a public host to a loopback address', async () => {
            const publicOrigin = 'http://webhook.example.test';
            const internalUrl = `http://127.0.0.1:${port}/internal-admin`;
            // Simulates a public host answering 302 -> loopback: with redirect: 'manual' the
            // caller sees the 302, with the default 'follow' the runtime lands on the loopback.
            undiciFetch.mock.mockImplementationOnce(async (_input: unknown, init?: RequestInit) => {
                if (init?.redirect === 'manual') {
                    return new Response(null, { status: 302, headers: { Location: internalUrl } });
                }
                return fetch(internalUrl, { method: 'POST' });
            });
            const manager = new WebhooksManager();

            await manager.deliver(`${publicOrigin}/hook`, secret, payload);

            expect(undiciFetch.mock).toHaveBeenCalledTimes(1);
            expect(receivedRequests).toEqual([]);
        });

        // cve-14: the URL check and the connection used to resolve the name separately, so a DNS answer that
        // changed in between (rebinding) sent the POST to an address the check never saw.
        it('does not POST when the name resolves to a loopback address at connection time', async () => {
            const lookupSpy = vi.spyOn(dns, 'lookup').mockResolvedValue([{ address: '127.0.0.1', family: 4 }] as never);
            const manager = new WebhooksManager();

            const result = await manager.deliver(`http://rebind.example.test:${port}/internal-admin`, secret, payload);

            expect(lookupSpy).toHaveBeenCalledTimes(1);
            expect(receivedRequests).toEqual([]);
            expect(result).toEqual({ success: false });
        });
    });

    describe('create() / update()', () => {
        it('rejects a webhook URL pointing at the cloud metadata endpoint', async () => {
            const createSpy = vi.spyOn(WebhooksRepository.prototype, 'create').mockResolvedValue(null);
            const manager = new WebhooksManager();

            await expect(
                manager.create({ goalId: 1, url: 'http://169.254.169.254/latest/meta-data/', events: ['task.created'] }),
            ).rejects.toThrow();

            expect(createSpy).not.toHaveBeenCalled();
        });

        it('rejects a webhook URL pointing at a private network address', async () => {
            const createSpy = vi.spyOn(WebhooksRepository.prototype, 'create').mockResolvedValue(null);
            const manager = new WebhooksManager();

            await expect(
                manager.create({ goalId: 1, url: 'http://192.168.1.10/', events: ['task.created'] }),
            ).rejects.toThrow();

            expect(createSpy).not.toHaveBeenCalled();
        });

        it('rejects a non-http(s) webhook URL', async () => {
            const createSpy = vi.spyOn(WebhooksRepository.prototype, 'create').mockResolvedValue(null);
            const manager = new WebhooksManager();

            await expect(
                manager.create({ goalId: 1, url: 'file:///etc/passwd', events: ['task.created'] }),
            ).rejects.toThrow();

            expect(createSpy).not.toHaveBeenCalled();
        });

        it('rejects updating a webhook URL to a loopback address', async () => {
            const updateSpy = vi.spyOn(WebhooksRepository.prototype, 'update').mockResolvedValue(null);
            const manager = new WebhooksManager();

            await expect(
                manager.update({ id: 1, url: `http://localhost:${port}/internal-admin` }),
            ).rejects.toThrow();

            expect(updateSpy).not.toHaveBeenCalled();
        });
    });

    describe('public destinations still work', () => {
        it('delivers to a hostname that resolves to a public address', async () => {
            undiciFetch.mock.mockResolvedValueOnce(new Response('ok', { status: 200 }));
            const manager = new WebhooksManager();

            const result = await manager.deliver('https://webhook.example.test/hook', secret, payload);

            expect(undiciFetch.mock).toHaveBeenCalledTimes(1);
            expect(String(undiciFetch.mock.mock.calls[0][0])).toBe('https://webhook.example.test/hook');
            expect(undiciFetch.mock.mock.calls[0][1]).toMatchObject({ method: 'POST', redirect: 'manual' });
            expect(undiciFetch.mock.mock.calls[0][1].dispatcher).toBeDefined();
            expect(result).toEqual({ success: true, responseCode: 200 });
        });

        it('fails delivery when the hostname does not resolve', async () => {
            vi.spyOn(dns, 'lookup').mockRejectedValue(new Error('ENOTFOUND'));
            const manager = new WebhooksManager();

            const result = await manager.deliver('https://nope.example.test/hook', secret, payload);

            expect(result).toEqual({ success: false });
        });

        it('accepts a public URL on create', async () => {
            vi.spyOn(dns, 'lookup').mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as any);
            const createSpy = vi.spyOn(WebhooksRepository.prototype, 'create').mockResolvedValue(null);
            const manager = new WebhooksManager();

            await manager.create({ goalId: 1, url: 'https://webhook.example.test/hook', events: ['task.created'] });

            expect(createSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('WEBHOOKS_ALLOW_PRIVATE_URLS=true (self-hosted opt-out)', () => {
        it('lets a delivery reach a loopback address', async () => {
            process.env.WEBHOOKS_ALLOW_PRIVATE_URLS = 'true';
            const manager = new WebhooksManager();

            const result = await manager.deliver(`http://127.0.0.1:${port}/hook`, secret, payload);

            expect(receivedRequests).toEqual([{ method: 'POST', url: '/hook' }]);
            expect(result).toEqual({ success: true, responseCode: 200 });
        });

        it('still rejects non-http(s) schemes', () => {
            process.env.WEBHOOKS_ALLOW_PRIVATE_URLS = 'true';

            expect(() => parseWebhookUrl('ftp://127.0.0.1/')).toThrow();
        });

        it('validateWebhooksEnvOnStartup rejects unrecognized values', () => {
            process.env.WEBHOOKS_ALLOW_PRIVATE_URLS = 'yes';
            expect(() => validateWebhooksEnvOnStartup()).toThrow('WEBHOOKS_ALLOW_PRIVATE_URLS');

            process.env.WEBHOOKS_ALLOW_PRIVATE_URLS = 'false';
            expect(() => validateWebhooksEnvOnStartup()).not.toThrow();

            delete process.env.WEBHOOKS_ALLOW_PRIVATE_URLS;
            expect(() => validateWebhooksEnvOnStartup()).not.toThrow();
        });
    });

    describe('parseWebhookUrl() literal-address edge cases', () => {
        it.each([
            'http://0x7f000001/',
            'http://2130706433/',
            'http://127.1/',
            'http://[::1]/',
            'http://[::ffff:7f00:1]/',
            'http://[fd00::1]/',
            'http://localhost./',
            'http://LOCALHOST/',
            'http://app.localhost/',
            'http://0.0.0.0/',
            'http://100.64.0.1/',
            'http://[64:ff9b::7f00:1]/',
        ])('rejects %s', (url) => {
            expect(() => parseWebhookUrl(url)).toThrow(/public address/);
        });

        it.each(['https://example.com/hook', 'http://93.184.216.34/hook', 'https://[2606:4700::1111]/hook'])(
            'accepts %s',
            (url) => {
                expect(() => parseWebhookUrl(url)).not.toThrow();
            },
        );
    });
});
