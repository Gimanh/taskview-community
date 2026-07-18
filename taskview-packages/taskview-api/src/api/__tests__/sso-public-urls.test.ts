import { describe, it, expect, beforeAll } from 'vitest'
import { TvApi } from '@/tv'
import { initApi } from './init-api'

// The test stack runs the API with API_PUBLIC_URL=https://api.public.example
// (set in docker/docker-compose.yml). The URLs an admin copies into an IdP
// must be built from that base — not from whatever host the request came in on.

let user1Api: TvApi

beforeAll(async () => {
  const init = await initApi()
  user1Api = init.$tvApi
})

describe('SSO public URLs (API_PUBLIC_URL)', () => {
  it('builds IdP-facing URLs from API_PUBLIC_URL, not from the request host', async () => {
    const urls = await user1Api.sso.getPublicUrls()

    expect(urls.apiPublicUrlConfigured).toBe(true)
    expect(urls.apiBaseUrl).toBe('https://api.public.example')
    expect(urls.callbackUrlTemplate).toBe('https://api.public.example/module/sso/callback/{id}')
    expect(urls.scimEndpointUrl).toBe('https://api.public.example/scim/v2')
  })
})
