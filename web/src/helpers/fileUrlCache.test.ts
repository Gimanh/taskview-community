import { describe, expect, it, vi } from 'vitest'
import { createFileUrlCache, type FileUrlLink } from '@/helpers/fileUrlCache'

const NOW = Date.parse('2026-01-01T00:00:00.000Z')

function linkExpiringIn(seconds: number, url = '/module/files/content/token'): FileUrlLink {
  return { url, expiresAt: new Date(NOW + seconds * 1000).toISOString() }
}

function setup(fetchLink: (fileId: string) => Promise<FileUrlLink | null>) {
  let now = NOW
  const fetchSpy = vi.fn(fetchLink)
  const cache = createFileUrlCache({ fetchLink: fetchSpy, now: () => now, refreshMarginMs: 30_000 })
  return { cache, fetchSpy, advance: (ms: number) => { now += ms } }
}

describe('createFileUrlCache', () => {
  it('reuses the cached url while it is far from expiring', async () => {
    const { cache, fetchSpy, advance } = setup(async () => linkExpiringIn(300))

    expect(await cache.get('a')).toBe('/module/files/content/token')
    advance(200_000)
    expect(await cache.get('a')).toBe('/module/files/content/token')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('requests a new url once the cached one is within the refresh margin', async () => {
    let calls = 0
    const { cache, fetchSpy, advance } = setup(async () => linkExpiringIn(300, `/content/${++calls}`))

    expect(await cache.get('a')).toBe('/content/1')
    advance(271_000)
    expect(await cache.get('a')).toBe('/content/2')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('shares one in-flight request between concurrent callers', async () => {
    const { cache, fetchSpy } = setup(async () => linkExpiringIn(300))

    const [first, second] = await Promise.all([cache.get('a'), cache.get('a')])

    expect(first).toBe(second)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('keeps entries per file id', async () => {
    const { cache, fetchSpy } = setup(async (fileId) => linkExpiringIn(300, `/content/${fileId}`))

    expect(await cache.get('a')).toBe('/content/a')
    expect(await cache.get('b')).toBe('/content/b')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('requests a new url after invalidate', async () => {
    const { cache, fetchSpy } = setup(async () => linkExpiringIn(300))

    await cache.get('a')
    cache.invalidate('a')
    await cache.get('a')

    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('returns null without caching when the request fails', async () => {
    let fail = true
    const { cache, fetchSpy } = setup(async () => {
      if (fail) throw new Error('forbidden')
      return linkExpiringIn(300)
    })

    expect(await cache.get('a')).toBeNull()
    fail = false
    expect(await cache.get('a')).toBe('/module/files/content/token')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('returns the url but does not cache it when expiresAt is not a valid date', async () => {
    const { cache, fetchSpy } = setup(async () => ({ url: '/content/x', expiresAt: 'nope' }))

    expect(await cache.get('a')).toBe('/content/x')
    await cache.get('a')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })
})
