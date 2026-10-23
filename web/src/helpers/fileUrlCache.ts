export type FileUrlLink = {
  url: string
  expiresAt: string
}

export type FileUrlCacheArgs = {
  fetchLink: (fileId: string) => Promise<FileUrlLink | null>
  now?: () => number
  // Entries are dropped this long before expiresAt so an <img> never starts loading an expired token.
  refreshMarginMs?: number
}

type CacheEntry = {
  url: string
  expiresAtMs: number
}

export function createFileUrlCache(args: FileUrlCacheArgs) {
  const now = args.now ?? Date.now
  const margin = args.refreshMarginMs ?? 30_000
  const entries = new Map<string, CacheEntry>()
  const pending = new Map<string, Promise<string | null>>()

  const request = (fileId: string): Promise<string | null> => args.fetchLink(fileId)
    .then((link) => {
      if (!link) return null
      const expiresAtMs = Date.parse(link.expiresAt)
      if (Number.isFinite(expiresAtMs)) entries.set(fileId, { url: link.url, expiresAtMs })
      return link.url
    })
    .catch(() => null)
    .finally(() => pending.delete(fileId))

  const get = (fileId: string): Promise<string | null> => {
    const entry = entries.get(fileId)
    if (entry && entry.expiresAtMs - margin > now()) return Promise.resolve(entry.url)
    entries.delete(fileId)

    const inFlight = pending.get(fileId)
    if (inFlight) return inFlight
    const promise = request(fileId)
    pending.set(fileId, promise)
    return promise
  }

  const invalidate = (fileId: string) => {
    entries.delete(fileId)
  }

  const clear = () => {
    entries.clear()
  }

  return { get, invalidate, clear }
}

export type FileUrlCache = ReturnType<typeof createFileUrlCache>
