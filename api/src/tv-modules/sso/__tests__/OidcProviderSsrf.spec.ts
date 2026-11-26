import { promises as dns } from 'dns'
import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'
import type { Request, Response } from 'express'
import type { SsoConfigsSchemaTypeForSelect } from 'taskview-db-schemas'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { OutboundUrlError } from '../../../utils/OutboundUrlError'
import { OidcProvider } from '../providers/oidc.provider'
import { oidcOutboundFetch } from '../sso.utils'

// The OIDC issuer is entered by an org admin and openid-client fetched its discovery document (and every endpoint
// that document names) with no address check, so the server could be pointed at internal services.
describe('OidcProvider outbound guard', () => {
  let server: Server
  let port: number
  let receivedRequests: string[]
  let receivedBodies: string[]

  const createProvider = (issuer: string) =>
    new OidcProvider({ id: 1, oidcIssuer: issuer, oidcClientId: 'client', oidcClientSecret: 'secret' } as SsoConfigsSchemaTypeForSelect)

  const startLogin = async (issuer: string) => {
    const redirect = vi.fn()
    const req = { protocol: 'http', get: () => 'localhost', headers: {} } as unknown as Request
    const res = { cookie: vi.fn(), redirect } as unknown as Response
    await createProvider(issuer).initiateLogin(req, res)
    return redirect
  }

  const findOutboundUrlError = (err: unknown): OutboundUrlError | null => {
    for (let current = err; current instanceof Error; current = current.cause) {
      if (current instanceof OutboundUrlError) return current
    }
    return null
  }

  beforeAll(async () => {
    server = createServer(async (req, res) => {
      receivedRequests.push(`${req.method} ${req.url}`)
      if (req.method === 'POST') {
        let body = ''
        for await (const chunk of req) body += chunk
        receivedBodies.push(`${req.headers['content-type']} ${body}`)
      }
      const issuer = `http://${req.headers.host}`
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        jwks_uri: `${issuer}/jwks`,
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
      }))
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    port = (server.address() as AddressInfo).port
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())))
  })

  beforeEach(() => {
    receivedRequests = []
    receivedBodies = []
  })

  afterEach(() => {
    delete process.env.SSO_ALLOW_PRIVATE_URLS
    vi.restoreAllMocks()
  })

  it('does not fetch discovery from a literal loopback issuer', async () => {
    const error = await startLogin(`http://127.0.0.1:${port}`).catch((err: unknown) => err)

    expect(findOutboundUrlError(error)).toMatchObject({ code: 'private' })
    expect(receivedRequests).toEqual([])
  })

  it('does not fetch discovery when the issuer name resolves to a private address', async () => {
    vi.spyOn(dns, 'lookup').mockResolvedValue([{ address: '127.0.0.1', family: 4 }] as never)

    const error = await startLogin(`http://idp.example.test:${port}`).catch((err: unknown) => err)

    expect(findOutboundUrlError(error)).toMatchObject({ code: 'private' })
    expect(receivedRequests).toEqual([])
  })

  it('reaches an internal IdP with SSO_ALLOW_PRIVATE_URLS=true', async () => {
    process.env.SSO_ALLOW_PRIVATE_URLS = 'true'

    const redirect = await startLogin(`http://127.0.0.1:${port}`)

    expect(receivedRequests).toEqual(['GET /.well-known/openid-configuration'])
    expect(String(redirect.mock.calls[0][0])).toContain(`http://127.0.0.1:${port}/authorize?`)
  })

  it('sends the token request body the way openid-client builds it', async () => {
    process.env.SSO_ALLOW_PRIVATE_URLS = 'true'

    const response = await oidcOutboundFetch(`http://127.0.0.1:${port}/token`, {
      method: 'POST',
      headers: { accept: 'application/json' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code: 'abc' }),
      redirect: 'manual',
    })

    expect(response.status).toBe(200)
    expect(receivedBodies).toEqual(['application/x-www-form-urlencoded;charset=UTF-8 grant_type=authorization_code&code=abc'])
  })
})
