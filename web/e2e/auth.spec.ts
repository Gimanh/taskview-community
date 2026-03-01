import { test, expect } from '@playwright/test'
import { TEST_USER } from './fixtures/auth'
import { setEnglishLocale } from './test-helpers'

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await setEnglishLocale(page)
    await page.reload()
  })

  test('shows login page with welcome message', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/welcome/i)
  })

  test('user can login with password and reach dashboard', async ({ page }) => {
    await page.getByRole('tab', { name: /password/i }).click()

    await page.getByTestId('login-input').fill(TEST_USER.login)
    await page.getByTestId('password-input').fill(TEST_USER.password)

    await page.getByTestId('sign-in-button').click()

    await expect(page).toHaveURL(/\/user/)
    await expect(page.locator('body')).not.toContainText(/invalid|error/i)
  })
})
