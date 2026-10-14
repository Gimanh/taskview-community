import { afterEach, describe, expect, it, vi } from 'vitest';
import { CentrifugoClient } from '../CentrifugoClient';

describe('CentrifugoClient.broadcastToUsers', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it('sends one broadcast to the personal channels of all users', async () => {
        vi.stubEnv('CENTRIFUGO_API_URL', 'http://centrifugo:8000');
        vi.stubEnv('CENTRIFUGO_API_KEY', 'secret');
        const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        const sent = await new CentrifugoClient().broadcastToUsers({ userIds: [1, 2], event: 'tasks.changed', data: { goalId: 10 } });

        expect(sent).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe('http://centrifugo:8000/api/broadcast');
        expect(JSON.parse(init.body as string)).toEqual({
            channels: ['personal:#1', 'personal:#2'],
            data: { event: 'tasks.changed', goalId: 10 },
        });
    });

    it('does nothing for an empty audience', async () => {
        vi.stubEnv('CENTRIFUGO_API_URL', 'http://centrifugo:8000');
        vi.stubEnv('CENTRIFUGO_API_KEY', 'secret');
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        expect(await new CentrifugoClient().broadcastToUsers({ userIds: [], event: 'tasks.changed', data: {} })).toBe(true);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
