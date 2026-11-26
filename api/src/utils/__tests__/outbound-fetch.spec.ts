import { promises as dns } from 'dns';
import { createServer, type Server } from 'http';
import type { AddressInfo } from 'net';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { OutboundUrlError } from '../OutboundUrlError';
import { outboundFetch } from '../outbound-fetch';
import { guardedLookup, resolveOutboundUrl } from '../outbound-url';

type LookupResult = { err: NodeJS.ErrnoException | null; address: unknown; family: unknown };

function runGuardedLookup(all: boolean): Promise<LookupResult> {
    return new Promise((resolve) => {
        guardedLookup('host.example.test', { all }, (err, address, family) => resolve({ err, address, family }));
    });
}

// cve-14: resolveOutboundUrl checked one DNS answer and fetch() then resolved the name again, so an answer that
// flipped between the two lookups (DNS rebinding) reached a private address the check never saw.
describe('outbound connection guard', () => {
    let server: Server;
    let port: number;
    let receivedRequests: string[];

    beforeAll(async () => {
        server = createServer((req, res) => {
            receivedRequests.push(`${req.method} ${req.url}`);
            res.writeHead(200);
            res.end('internal');
        });
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
        port = (server.address() as AddressInfo).port;
    });

    afterAll(async () => {
        await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    });

    beforeEach(() => {
        receivedRequests = [];
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('outboundFetch()', () => {
        it('refuses a name that passed the URL check and then resolves to loopback for the connection', async () => {
            const url = `http://rebind.example.test:${port}/internal-admin`;
            vi.spyOn(dns, 'lookup')
                .mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }] as never)
                .mockResolvedValue([{ address: '127.0.0.1', family: 4 }] as never);

            await expect(resolveOutboundUrl({ url, allowPrivate: false })).resolves.toBeInstanceOf(URL);

            const error = await outboundFetch({ url, allowPrivate: false, init: { method: 'POST', redirect: 'manual' } }).catch(
                (err: unknown) => err,
            );

            expect(error).toBeInstanceOf(OutboundUrlError);
            expect((error as OutboundUrlError).code).toBe('private');
            expect(receivedRequests).toEqual([]);
        });

        it('refuses a literal private address without connecting', async () => {
            await expect(
                outboundFetch({ url: `http://127.0.0.1:${port}/internal-admin`, allowPrivate: false, init: { redirect: 'error' } }),
            ).rejects.toMatchObject({ code: 'private' });

            expect(receivedRequests).toEqual([]);
        });

        it('reports a name that does not resolve as unresolvable', async () => {
            vi.spyOn(dns, 'lookup').mockRejectedValue(new Error('ENOTFOUND'));

            await expect(
                outboundFetch({ url: 'http://nowhere.example.test/', allowPrivate: false, init: { redirect: 'error' } }),
            ).rejects.toMatchObject({ code: 'unresolvable' });
        });

        it('reaches a private address when the feature allows private URLs', async () => {
            const response = await outboundFetch({
                url: `http://127.0.0.1:${port}/hook`,
                allowPrivate: true,
                init: { method: 'POST', redirect: 'manual' },
            });

            expect(response.status).toBe(200);
            expect(receivedRequests).toEqual(['POST /hook']);
        });
    });

    describe('guardedLookup()', () => {
        it('hands the socket exactly the addresses it checked', async () => {
            const addresses = [
                { address: '93.184.216.34', family: 4 },
                { address: '2606:4700::1111', family: 6 },
            ];
            vi.spyOn(dns, 'lookup').mockResolvedValue(addresses as never);

            expect(await runGuardedLookup(true)).toMatchObject({ err: null, address: addresses });
            expect(await runGuardedLookup(false)).toMatchObject({ err: null, address: '93.184.216.34', family: 4 });
        });

        it('refuses the whole answer when any address is private', async () => {
            vi.spyOn(dns, 'lookup').mockResolvedValue([
                { address: '93.184.216.34', family: 4 },
                { address: '10.0.0.5', family: 4 },
            ] as never);

            const result = await runGuardedLookup(true);

            expect(result.err).toBeInstanceOf(OutboundUrlError);
            expect(result.err).toMatchObject({ code: 'private' });
        });

        it.each(['169.254.169.254', '::1', '::ffff:127.0.0.1', 'fd00::1'])('refuses an answer of %s', async (address) => {
            vi.spyOn(dns, 'lookup').mockResolvedValue([{ address, family: address.includes(':') ? 6 : 4 }] as never);

            expect((await runGuardedLookup(false)).err).toMatchObject({ code: 'private' });
        });
    });
});
