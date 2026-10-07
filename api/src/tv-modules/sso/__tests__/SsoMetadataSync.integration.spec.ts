import axios, { type AxiosInstance } from 'axios'
import { createServer, type Server } from 'http'
import http from 'http'
import type { AddressInfo } from 'net'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import App from '../../../App'

vi.mock('emailjs', () => ({
  SMTPClient: vi.fn().mockImplementation(() => ({ sendAsync: vi.fn().mockResolvedValue(true) })),
}))

const port = 1827
const api: AxiosInstance = axios.create({
  baseURL: `http://localhost:${port}`,
  validateStatus: () => true,
  httpAgent: new http.Agent({ keepAlive: false }),
})

const METADATA = `<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" entityID="https://idp.example.com">
  <md:IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing"><ds:KeyInfo><ds:X509Data><ds:X509Certificate>MIICERT</ds:X509Certificate></ds:X509Data></ds:KeyInfo></md:KeyDescriptor>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://idp.example.com/slo"/>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://idp.example.com/sso"/>
  </md:IDPSSODescriptor>
</md:EntityDescriptor>`

let server: http.Server
let metadataServer: Server
let metadataUrl = ''
let auth: { headers: { Authorization: string } }
let organizationId = 0
const savedAllow = process.env.SSO_ALLOW_PRIVATE_URLS

// Issue #125: the SAML form's "Sync" always got an empty 400 because the client never sent the organization
// the org-admin guard needs. With the organization the request reaches the metadata fetch, which is SSRF-guarded.
describe('SSO SAML metadata sync', () => {
  beforeAll(async () => {
    metadataServer = createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/xml' })
      res.end(METADATA)
    })
    await new Promise<void>((resolve) => metadataServer.listen(0, '127.0.0.1', resolve))
    metadataUrl = `http://127.0.0.1:${(metadataServer.address() as AddressInfo).port}/metadata`

    server = new App(port).listen()
    const login = await api.post('/module/auth/login', { login: 'test@mail.dest', password: 'user1!#Q' })
    expect(login.status).toBe(200)
    auth = { headers: { Authorization: `Bearer ${login.data.access}` } }
    const org = await api.post('/module/organizations', { name: `sso-sync-${Date.now()}` }, auth)
    expect(org.status).toBe(200)
    organizationId = org.data.response.id
  })

  afterAll(async () => {
    if (savedAllow === undefined) delete process.env.SSO_ALLOW_PRIVATE_URLS
    else process.env.SSO_ALLOW_PRIVATE_URLS = savedAllow
    if (organizationId) await api.delete(`/module/organizations/${organizationId}`, auth)
    await new Promise<void>((resolve) => metadataServer.close(() => resolve()))
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it('is refused by the org-admin guard without an organization (what the old client sent)', async () => {
    const response = await api.get('/module/sso/admin/metadata', { ...auth, params: { url: metadataUrl } })
    expect(response.status).toBe(400)
  })

  it('reaches the fetch with the organization and refuses an internal metadata URL', async () => {
    delete process.env.SSO_ALLOW_PRIVATE_URLS
    const response = await api.get('/module/sso/admin/metadata', { ...auth, params: { url: metadataUrl, organizationId } })
    expect(response.status).toBe(400)
    expect(response.data.response).toMatchObject({ message: 'URL must point to a public address' })
  })

  it('fetches and parses the metadata when the IdP may be internal (self-hosted opt-out)', async () => {
    process.env.SSO_ALLOW_PRIVATE_URLS = 'true'
    const response = await api.get('/module/sso/admin/metadata', { ...auth, params: { url: metadataUrl, organizationId } })
    expect(response.status).toBe(200)
    expect(response.data.response).toEqual({
      samlEntryPoint: 'https://idp.example.com/sso',
      samlCert: 'MIICERT',
      samlLogoutUrl: 'https://idp.example.com/slo',
    })
  })
})
