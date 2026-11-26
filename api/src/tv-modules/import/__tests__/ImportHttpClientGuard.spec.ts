import { promises as dns } from 'dns';
import { createServer, type Server } from 'http';
import type { AddressInfo } from 'net';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { guardedLookup } from '../../../utils/outbound-url';
import { ImportHttpClient } from '../core/ImportHttpClient';

// cve-14: a user-supplied base URL (Jira Data Center) was checked once and then dialled by name, so a DNS answer
// that changed afterwards sent the requests, credentials included, to a private address.
describe('ImportHttpClient connection guard', () => {
    let server: Server;
    let port: number;
    let receivedRequests: string[];

    const createClient = (lookup?: typeof guardedLookup) =>
        new ImportHttpClient({
            providerName: 'JiraDc',
            baseUrl: `http://jira.example.test:${port}`,
            headers: { Authorization: 'Bearer token' },
            minRequestIntervalMs: 0,
            maxRedirects: 0,
            lookup,
        });

    beforeAll(async () => {
        server = createServer((req, res) => {
            receivedRequests.push(`${req.method} ${req.url}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end('{"name":"internal"}');
        });
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
        port = (server.address() as AddressInfo).port;
    });

    afterAll(async () => {
        await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    });

    beforeEach(() => {
        receivedRequests = [];
        vi.spyOn(dns, 'lookup').mockResolvedValue([{ address: '127.0.0.1', family: 4 }] as never);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('does not send the request when the name resolves to a private address at connection time', async () => {
        await expect(createClient(guardedLookup).get({ path: '/rest/api/2/myself' })).rejects.toMatchObject({
            code: 'unavailable',
        });

        expect(receivedRequests).toEqual([]);
    });

    it('connects to whatever the guarded resolver returns', async () => {
        const unguarded: typeof guardedLookup = (_hostname, options, callback) => {
            if (options.all) callback(null, [{ address: '127.0.0.1', family: 4 }]);
            else callback(null, '127.0.0.1', 4);
        };

        await expect(createClient(unguarded).get({ path: '/rest/api/2/myself' })).resolves.toEqual({ name: 'internal' });

        expect(receivedRequests).toEqual(['GET /rest/api/2/myself']);
    });
});
