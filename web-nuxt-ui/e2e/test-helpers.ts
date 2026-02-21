import { TEST_USER } from './fixtures/auth'

export async function login(page: Page) {
  await page.getByRole('tab', { name: /password|пароль/i }).click()
  await page.getByTestId('login-input').fill(TEST_USER.login)
  await page.getByTestId('password-input').fill(TEST_USER.password)
  await page.getByTestId('sign-in-button').click()
}