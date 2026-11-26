import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { TEST_USER } from './fixtures/auth'
import { LOGIN_URL, REFRESH_URL } from './fixtures/foreign-site'
import type { RefreshFromPageArgs } from './refresh-rotation.spec.types'

const REFRESH_COOKIE = 'taskview-refresh'

async function signIn(context: BrowserContext): Promise<string> {
  const response = await context.request.post(LOGIN_URL, { form: TEST_USER })
  expect(response.status()).toBe(200)
  const { csrf } = await response.json()
  expect(csrf).toBeTruthy()
  return csrf
}

function refreshFrom({ page, csrf }: RefreshFromPageArgs) {
  return page.evaluate(async ({ url, csrfToken }) => {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
    })
    return response.status
  }, { url: REFRESH_URL, csrfToken: csrf })
}

async function refreshCookie(context: BrowserContext) {
  return (await context.cookies(REFRESH_URL)).find((c) => c.name === REFRESH_COOKIE)
}

// Every refresh token works once. Tabs of one browser share the cookie, so two
// of them may send the same token at the same moment: that must not look like theft
test.describe('Refresh token rotation across tabs', () => {
  test('two tabs refreshing at the same moment both stay signed in', async ({ context }) => {
    const csrf = await signIn(context)
    const firstTab = await context.newPage()
    const secondTab = await context.newPage()
    await Promise.all([firstTab.goto('/'), secondTab.goto('/')])
    const cookieBefore = (await refreshCookie(context))?.value

    expect(await Promise.all([
      refreshFrom({ page: firstTab, csrf }),
      refreshFrom({ page: secondTab, csrf }),
    ])).toEqual([200, 200])

    const cookieAfter = (await refreshCookie(context))?.value
    expect(cookieAfter).toBeTruthy()
    expect(cookieAfter).not.toBe(cookieBefore)
    expect(await refreshFrom({ page: firstTab, csrf })).toBe(200)
    expect(await refreshFrom({ page: secondTab, csrf })).toBe(200)
  })

  test('a refresh cookie from two rotations back signs the browser out', async ({ context, page }) => {
    const csrf = await signIn(context)
    await page.goto('/')
    const staleCookie = await refreshCookie(context)

    expect(await refreshFrom({ page, csrf })).toBe(200)
    expect(await refreshFrom({ page, csrf })).toBe(200)
    await context.addCookies([staleCookie!])

    expect(await refreshFrom({ page, csrf })).toBe(401)
    expect(await refreshCookie(context)).toBeUndefined()
  })
})

test.describe('CSRF token on a refresh by cookie', () => {
  test('a refresh without the CSRF token of the session is refused and spends nothing', async ({ context, page }) => {
    const csrf = await signIn(context)
    await page.goto('/')
    const cookieBefore = (await refreshCookie(context))?.value

    expect(await refreshFrom({ page })).toBe(403)
    expect(await refreshFrom({ page, csrf: 'XMLHttpRequest' })).toBe(403)
    expect(await refreshFrom({ page, csrf: `${csrf}x` })).toBe(403)

    expect((await refreshCookie(context))?.value).toBe(cookieBefore)
    expect(await refreshFrom({ page, csrf })).toBe(200)
  })

  test('the CSRF token of another session of the same user does not fit', async ({ browser, context, page }) => {
    const csrf = await signIn(context)
    const otherDevice = await browser.newContext()
    const otherCsrf = await signIn(otherDevice)
    await otherDevice.close()
    await page.goto('/')

    expect(await refreshFrom({ page, csrf: otherCsrf })).toBe(403)
    expect(await refreshFrom({ page, csrf })).toBe(200)
  })
})
