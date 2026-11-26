import type { BrowserContext } from '@playwright/test'
import { TEST_USER } from './fixtures/auth'
import { test, expect, LOGIN_URL, REFRESH_URL } from './fixtures/foreign-site'
import { watchWireExchange } from './wire-exchange'
import type { CrossSiteRefreshResult } from './refresh-cross-site.spec.types'

const REFRESH_COOKIE = 'taskview-refresh'

// The refresh cookie set by the API lands in the browser's cookie jar,
// exactly where a sign-in through the app leaves it
async function signIn(context: BrowserContext) {
  const response = await context.request.post(LOGIN_URL, { form: TEST_USER })
  expect(response.status()).toBe(200)
}

// A foreign page must not be able to renew the session of a signed-in user
// and read the new tokens (issue #154)
test.describe('Refresh token and foreign sites', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context)
  })

  test('a sandboxed frame on a foreign site gets neither the refresh cookie nor the tokens', async ({ page, context, foreignSite }) => {
    const sessionCookie = (await context.cookies(REFRESH_URL)).find((c) => c.name === REFRESH_COOKIE)
    expect(sessionCookie, 'the signed-in session keeps its refresh token in a cookie').toBeTruthy()
    expect(sessionCookie?.httpOnly).toBe(true)
    expect(sessionCookie?.sameSite).toBe('Lax')

    await page.goto(foreignSite.url)
    const wireExchange = await watchWireExchange({ page, url: REFRESH_URL })
    await page.evaluate(() => frames[0].postMessage('refresh', '*'))

    const result = await page.waitForFunction(() => (window as any).refreshResult)
    expect((await result.jsonValue()) as CrossSiteRefreshResult).toEqual({ read: false })

    const { requestHeaders, blockedCookies, status, responseHeaders } = await wireExchange()
    expect(requestHeaders.origin).toBe('null')
    expect(requestHeaders.cookie).toBeUndefined()
    expect(blockedCookies[REFRESH_COOKIE]).toContain('SameSiteLax')
    expect(status).not.toBe(200)
    expect(responseHeaders['access-control-allow-origin']).toBeUndefined()
    expect(responseHeaders['set-cookie']).toBeUndefined()
  })

  test('the proof of concept from issue #154 delivers nothing to its collector', async ({ page, foreignSite }) => {
    const wireExchange = await watchWireExchange({ page, url: REFRESH_URL })
    await page.goto(foreignSite.reportedPocUrl)

    const { requestHeaders, blockedCookies, status, responseHeaders } = await wireExchange()
    expect(requestHeaders.origin).toBe('null')
    expect(requestHeaders.cookie).toBeUndefined()
    expect(blockedCookies[REFRESH_COOKIE]).toContain('SameSiteLax')
    expect(status).not.toBe(200)
    expect(responseHeaders['access-control-allow-origin']).toBeUndefined()

    // The collector does work: a beacon sent after the refresh attempt arrives,
    // and it is the only thing that ever does
    await page.evaluate(() => navigator.sendBeacon('/collect', 'collector-is-alive'))
    await expect.poll(() => foreignSite.collected).toContain('collector-is-alive')
    expect(foreignSite.collected).toEqual(['collector-is-alive'])
  })

  test('the app itself still renews the session from the cookie', async ({ page }) => {
    await page.goto('/')

    const renewed = await page.evaluate(async (url) => {
      const response = await fetch(url, { method: 'POST', credentials: 'include' })
      const body = await response.json()
      return { status: response.status, hasAccess: Boolean(body.access), hasRefresh: 'refresh' in body }
    }, REFRESH_URL)

    expect(renewed).toEqual({ status: 200, hasAccess: true, hasRefresh: false })
  })
})
