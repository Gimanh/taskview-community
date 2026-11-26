import { expect } from '@playwright/test'
import type { WatchWireExchangeArgs, WireExchange } from './refresh-cross-site.spec.types'

const lowerCased = (headers: Record<string, string>) =>
  Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]))

// What actually went over the wire for a request to `url`, taken from the
// browser's network stack. Playwright's own request object only has the
// provisional headers for a request whose response CORS hides from the page:
// no Cookie, no Origin and no response at all.
// Call before the request is made; the returned function waits for the exchange
export async function watchWireExchange({ page, url }: WatchWireExchangeArgs): Promise<() => Promise<WireExchange>> {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Network.enable')

  let requestId: string | undefined
  const requests = new Map<string, Pick<WireExchange, 'requestHeaders' | 'blockedCookies'>>()
  const responses = new Map<string, Pick<WireExchange, 'status' | 'responseHeaders'>>()

  cdp.on('Network.requestWillBeSent', (event) => {
    if (event.request.url === url) requestId = event.requestId
  })
  cdp.on('Network.requestWillBeSentExtraInfo', (event) => {
    requests.set(event.requestId, {
      requestHeaders: lowerCased(event.headers),
      blockedCookies: Object.fromEntries(
        event.associatedCookies
          .filter((entry) => entry.blockedReasons.length > 0)
          .map((entry) => [entry.cookie.name, entry.blockedReasons]),
      ),
    })
  })
  cdp.on('Network.responseReceivedExtraInfo', (event) => {
    responses.set(event.requestId, { status: event.statusCode, responseHeaders: lowerCased(event.headers) })
  })

  return async () => {
    await expect
      .poll(() => Boolean(requestId && requests.has(requestId) && responses.has(requestId)), {
        message: `request to ${url} and its response were seen on the wire`,
      })
      .toBe(true)
    const id = requestId as string
    return { ...requests.get(id)!, ...responses.get(id)! }
  }
}
