import { test, expect } from '@playwright/test'
import { TEST_USER } from './fixtures/auth'

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows login page with welcome message', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/welcome|возвращением/i)
  })

  test('user can login with password and reach dashboard', async ({ page }) => {
    // Switch to Password tab (default is Magic link)
    await page.getByRole('tab', { name: /password|пароль/i }).click()

    // Fill credentials
    await page.getByTestId('login-input').fill(TEST_USER.login)
    await page.getByTestId('password-input').fill(TEST_USER.password)

    // Submit
    await page.getByTestId('sign-in-button').click()

    // Should redirect to user dashboard
    await expect(page).toHaveURL(/\/user/)
    // Dashboard should be visible (sidebar or main content)
    await expect(page.locator('body')).not.toContainText(/invalid|неверный|error|ошибка/i)
  })
})
