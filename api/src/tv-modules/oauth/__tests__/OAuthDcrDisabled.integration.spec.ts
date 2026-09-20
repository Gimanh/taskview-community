import axios from 'axios';
import http from 'http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import App from '../../../App';

const port = 1812;
const url = `http://localhost:${port}`;

let server: http.Server;
// Each case boots its own server on the same port. A keep-alive socket pooled
// against the previous server would be dead by then, so pooling is off.
const api = axios.create({
    baseURL: url,
    validateStatus: () => true,
    httpAgent: new http.Agent({ keepAlive: false }),
});

/**
 * Dynamic client registration is opt-in: an instance where the operator has not
 * set OAUTH_DYNAMIC_REGISTRATION=true keeps the client registry closed. That has
 * to do two things: refuse registration, and stop advertising the endpoint — a
 * client that reads the metadata should never attempt a registration this
 * instance will reject. The default (variable unset) is what a fresh install
 * runs with, so it is the case that matters most.
 */
describe.each([
    { label: 'variable not set (default)', value: undefined },
    { label: 'variable set to false', value: 'false' },
])('OAuth with dynamic client registration disabled: $label', ({ value }) => {
    vi.mock('emailjs', () => ({
        SMTPClient: vi.fn().mockImplementation(() => ({ sendAsync: vi.fn().mockResolvedValue(true) })),
    }));

    beforeAll(() => {
        if (value === undefined) delete process.env.OAUTH_DYNAMIC_REGISTRATION;
        else process.env.OAUTH_DYNAMIC_REGISTRATION = value;
        server = new App(port).listen();
    });

    afterAll(async () => {
        // The next case listens on the same port, so wait for the socket to be released.
        await new Promise<void>((resolve) => server.close(() => resolve()));
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
