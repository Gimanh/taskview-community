import axios from 'axios';
import type http from 'http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import App from '../../../App';

const port = 1812;
const url = `http://localhost:${port}`;

let server: http.Server;
const api = axios.create({ baseURL: url, validateStatus: () => true });

/**
 * OAUTH_DYNAMIC_REGISTRATION=false is the lever a self-hosted operator pulls to
 * keep the client registry closed. It has to do two things: refuse registration,
 * and stop advertising the endpoint — a client that reads the metadata should
 * never attempt a registration this instance will reject.
 */
describe('OAuth with dynamic client registration disabled', () => {
    vi.mock('emailjs', () => ({
        SMTPClient: vi.fn().mockImplementation(() => ({ sendAsync: vi.fn().mockResolvedValue(true) })),
    }));

    beforeAll(() => {
        process.env.OAUTH_DYNAMIC_REGISTRATION = 'false';
        server = new App(port).listen();
    });

    afterAll(() => {
        server?.close();
        delete process.env.OAUTH_DYNAMIC_REGISTRATION;
    });

    it('refuses to register a client', async () => {
        const response = await api.post('/module/oauth/register', {
            client_name: 'Should be refused',
            redirect_uris: ['https://client.test/cb'],
        });

        expect(response.status).toBe(403);
        expect(response.data.error).toBe('access_denied');
    });

    it('stops advertising the registration endpoint in the metadata', async () => {
        const response = await api.get('/.well-known/oauth-authorization-server');

        expect(response.status).toBe(200);
        expect(response.data.registration_endpoint).toBeUndefined();
        // The rest of the flow stays available for manually seeded clients.
        expect(response.data.authorization_endpoint).toContain('/module/oauth/authorize');
        expect(response.data.token_endpoint).toContain('/module/oauth/token');
    });
});
