import { test, expect, type Page } from '@playwright/test'
import { TEST_USER } from './fixtures/auth'
import { LOGIN_URL, REFRESH_URL } from './fixtures/foreign-site'

const REFRESH_COOKIE = 'taskview-refresh'

function refreshFrom(page: Page) {
  return page.evaluate(async (url) => {
    const response = await fetch(url, { method: 'POST', credentials: 'include' })
    return response.status
  }, REFRESH_URL)
}

// Every refresh token works once. Tabs of one browser share the cookie, so two
// of them may send the same token at the same moment: that must not look like theft
test.describe('Refresh token rotation across tabs', () => {
  test('two tabs refreshing at the same moment both stay signed in', async ({ context }) => {
    const signIn = await context.request.post(LOGIN_URL, { form: TEST_USER })
    expect(signIn.status()).toBe(200)

    const firstTab = await context.newPage()
    const secondTab = await context.newPage()
    await Promise.all([firstTab.goto('/'), secondTab.goto('/')])
    const cookieBefore = (await context.cookies(REFRESH_URL)).find((c) => c.name === REFRESH_COOKIE)?.value

    expect(await Promise.all([refreshFrom(firstTab), refreshFrom(secondTab)])).toEqual([200, 200])

    const cookieAfter = (await context.cookies(REFRESH_URL)).find((c) => c.name === REFRESH_COOKIE)?.value
    expect(cookieAfter).toBeTruthy()
    expect(cookieAfter).not.toBe(cookieBefore)
    expect(await refreshFrom(firstTab)).toBe(200)
    expect(await refreshFrom(secondTab)).toBe(200)
  })

  test('a refresh cookie from two rotations back signs the browser out', async ({ context, page }) => {
    const signIn = await context.request.post(LOGIN_URL, { form: TEST_USER })
    expect(signIn.status()).toBe(200)
    await page.goto('/')
    const [staleCookie] = (await context.cookies(REFRESH_URL)).filter((c) => c.name === REFRESH_COOKIE)

    expect(await refreshFrom(page)).toBe(200)
    expect(await refreshFrom(page)).toBe(200)
    await context.addCookies([staleCookie])

    expect(await refreshFrom(page)).toBe(401)
    expect((await context.cookies(REFRESH_URL)).find((c) => c.name === REFRESH_COOKIE)).toBeUndefined()
  })
})
