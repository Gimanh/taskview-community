import { promises as dns } from 'dns'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkSsoFetchUrl, validateSsoEnvOnStartup } from '../sso.utils'

// The server fetches IdP metadata and the domain-ownership file for SSO. Those URLs must not reach internal
// addresses, whether written literally or behind a public-looking name that resolves inward.
describe('checkSsoFetchUrl', () => {
  const saved = { env: process.env.NODE_ENV, allow: process.env.SSO_ALLOW_PRIVATE_URLS }

  afterEach(() => {
    process.env.NODE_ENV = saved.env
    if (saved.allow === undefined) delete process.env.SSO_ALLOW_PRIVATE_URLS
    else process.env.SSO_ALLOW_PRIVATE_URLS = saved.allow
    vi.restoreAllMocks()
  })

  const resolvesTo = (address: string) =>
    vi.spyOn(dns, 'lookup').mockResolvedValue([{ address, family: address.includes(':') ? 6 : 4 }] as never)

  it.each(['http://127.0.0.1/metadata', 'http://localhost/metadata', 'http://10.0.0.5/metadata', 'http://169.254.169.254/latest', 'http://[::1]/x'])(
    'refuses the internal address %s',
    async (url) => {
      expect(await checkSsoFetchUrl(url)).toBe('URL must point to a public address')
    },
  )

  it('refuses a public-looking host that resolves to a private address', async () => {
    resolvesTo('10.1.2.3')
    expect(await checkSsoFetchUrl('https://idp.example.com/metadata')).toBe('URL must point to a public address')
  })

  it('refuses a host that resolves to the cloud metadata address', async () => {
    resolvesTo('169.254.169.254')
    expect(await checkSsoFetchUrl('https://idp.example.com/metadata')).toBe('URL must point to a public address')
  })

  it('refuses a host that does not resolve', async () => {
    vi.spyOn(dns, 'lookup').mockRejectedValue(new Error('ENOTFOUND'))
    expect(await checkSsoFetchUrl('https://nowhere.example.com/metadata')).toBe('URL host could not be resolved')
  })

  it('accepts a host that resolves to a public address', async () => {
    resolvesTo('93.184.216.34')
    expect(await checkSsoFetchUrl('https://idp.example.com/metadata')).toBeNull()
  })

  it('refuses non-http schemes and plain http in production', async () => {
    expect(await checkSsoFetchUrl('file:///etc/passwd')).toBe('URL must use http or https')
    process.env.NODE_ENV = 'production'
    expect(await checkSsoFetchUrl('http://idp.example.com/metadata')).toBe('Only HTTPS URLs are allowed')
  })

  it('lets a self-hosted install reach an internal IdP with SSO_ALLOW_PRIVATE_URLS=true', async () => {
    process.env.SSO_ALLOW_PRIVATE_URLS = 'true'
    resolvesTo('10.1.2.3')
    expect(await checkSsoFetchUrl('https://keycloak.internal/metadata')).toBeNull()
    expect(await checkSsoFetchUrl('http://192.168.1.10/metadata')).toBeNull()
    expect(await checkSsoFetchUrl('file:///etc/passwd')).toBe('URL must use http or https')
  })

  it('stops the server on an unrecognized SSO_ALLOW_PRIVATE_URLS value', () => {
    process.env.SSO_ALLOW_PRIVATE_URLS = 'yes'
    expect(() => validateSsoEnvOnStartup()).toThrow('SSO_ALLOW_PRIVATE_URLS')
    process.env.SSO_ALLOW_PRIVATE_URLS = 'false'
    expect(() => validateSsoEnvOnStartup()).not.toThrow()
  })
})
